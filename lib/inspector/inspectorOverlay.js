/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { DomCache } = require("../dom/domCache.js");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { Theme } = require("../chrome/theme.js");
const { Win } = require("../core/window.js");
const { DomSidePanel } = require("../dom/domSidePanel.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * @overlay This object is responsible for the Inspector panel
 * customization.
 *
 * It should append DOM side panel displaying properties of the
 * selected node (if Firebug theme is activated). Blocked by:
 * New API: WalkerFront.getObjectActorFromNodeActor()
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1035742
 */
const InspectorOverlay = Class(
/** @lends InspectorOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("inspectorOverlay.initialize;", options);
  },

  onBuild: function(options) {
    BaseOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("inspectorOverlay.onBuild;", options.panel);

    this.onMarkupViewRender = this.onMarkupViewRender.bind(this);
    this.onMarkupViewLoaded = this.onMarkupViewLoaded.bind(this);

    // Handle MarkupView events.
    this.panel.on("markupview-render", this.onMarkupViewRender);
    this.panel.on("markuploaded", this.onMarkupViewLoaded);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("inspectorOverlay.onReady;", options);

    // Register selection change listener.
    this.onNodeSelected = this.onNodeSelected.bind(this);
    this.panel.selection.on("new-node-front", this.onNodeSelected);
  },

  destroy: function() {
    this.panel.off("markupview-render", this.onMarkupViewRender);
    this.panel.off("markuploaded", this.onMarkupViewLoaded);
  },

  // Side panels

  setupSidePanels: function() {
    if (Theme.isFirebugActive()) {
      BaseOverlay.prototype.setupSidePanels.apply(this, arguments);
    }
  },

  getSidePanels: function() {
    return [DomSidePanel];
  },

  // Events

  onNodeSelected: function() {
    // Bail out if the panel is destroyed.
    if (!this.panel.toolbox)
      return;

    Trace.sysout("inspectorOverlay.onNodeSelected;",
      this.panel.selection);

    this.updateDomPanel(this.panel.selection.nodeFront);
  },

  updateDomPanel: function(nodeFront) {
    // Make sure we are attached to backend thread.
    let target = this.toolbox.target;
    target.activeTab.attachThread({}, (response, threadClient) => {

      // Make sure the inspector is initialized.
      this.toolbox.initInspector().then(() => {
        Trace.sysout("inspectorOverlay.onNodeSelected; nodeFront",
          nodeFront);

        let walker = this.toolbox.walker;

        // xxxHonza: Platform API needed, patch attached to the following bug:
        // Bug 1035742 - New API: WalkerFront.getObjectActorFromNodeActor()
        if (typeof walker.getObjectActorFromNodeActor == "undefined")
          return;

        // Get object grip from inspector's front node.
        walker.getObjectActorFromNodeActor(nodeFront).then(grip => {
          Trace.sysout("inspectorOverlay.onNodeSelected; grip", grip);

          // Refresh appropriate side panel
          // xxxHonza: dup from ConsoleOverlay, we need generic API
          for (let panel of this.sidePanels.values()) {
            if (panel.supportsObject(options.objectActor)) {
              panel.refresh(options.objectActor);
            }
          }
        });
      });
    });
  },

  onMarkupViewRender: function(eventId, node, type, data, options) {
    // xxxHonza: just testing markup view customization
    let value;
    let nodeFront = data.node;

    switch (type) {
    case "element":
      value = nodeFront.nodeName;
      break;
    case "attribute":
      value = data.attrName;
      break;
    case "comment":
      value = nodeFront.shortValue;
      break;
    case "container":
      value = type;
      break;
    }

    // xxxHonza: blocked by issue #1
    /*Trace.sysout("inspectorOverlay.onMarkupViewRender; " + type +
      ", " + value, {
      html: node.innerHTML,
      node: node,
      data: data,
      type: type,
      options: options
    });*/

    if (type != "element")
      return;

    let xpath = "";
    while (nodeFront) {
      let name = nodeFront.tagName ? nodeFront.tagName : "";
      xpath = name + "/" + xpath;
      nodeFront = nodeFront._parent;
    }

    node.setAttribute("title", xpath.toLowerCase());
  },

  onMarkupViewLoaded: function() {
    // xxxHonza: should be done when onThemeSwitch happens.
    let doc = this.panel._markupFrame.contentDocument;
    doc.documentElement.classList.add("theme-firebug");
    doc.documentElement.classList.remove("theme-light");

    // An iframe for the MarkupView has been loaded, so it's
    // time to register Firebug theme.
    let win = this.panel._markupFrame.contentWindow;
    loadSheet(win, "chrome://firebug/skin/markup-view.css", "author");
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    Trace.sysout("inspectorOverlay.onApplyTheme; " + iframeWin.inspector,
      iframeWin);

    // xxxHonza: for now we don't need default theme, but
    // this is rather a hack FIX ME.
    let doc = iframeWin.document;
    let classList = doc.documentElement.classList;
    classList.remove("theme-light");

    loadSheet(iframeWin, "chrome://firebug/skin/inspector.css", "author");

    Theme.customizeSideBarSplitter(iframeWin, true);

    this.setupSidePanels();
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(iframeWin, "chrome://firebug/skin/inspector.css", "author");

    // Remove splitter customization
    Theme.customizeSideBarSplitter(iframeWin, false);

    this.removeSidePanels();
  },
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
