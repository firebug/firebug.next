/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { DomCache } = require("../dom/domCache.js");
const { BaseOverlay } = require("../chrome/baseOverlay.js");

Cu.import("resource://gre/modules/Services.jsm");

/**
 * @overlay This object is responsible for the Inspector panel
 * customization. It appends a DOM side panel displaying properties
 * of the selected node among other things.
 */
const InspectorOverlay = Class(
/** @lends InspectorOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    Trace.sysout("InspectorOverlay.initialize;", options);
  },

  onBuild: function(options) {
    Trace.sysout("InspectorOverlay.onBuild;", options.panel);

    this.panel = options.panel;
    this.toolbox = options.toolbox;

    // Handle MarkupView events.
    this.panel.on("markupview-render", this.onMarkupViewRender.bind(this));
    this.panel.on("markuploaded", this.onMarkupViewLoaded.bind(this));
  },

  onReady: function(options) {
    Trace.sysout("InspectorOverlay.onReady;", options);

    let doc = this.panel.panelWin.document;
    doc.documentElement.classList.add("theme-firebug");
    doc.documentElement.classList.remove("theme-light");

    let win = this.panel.panelWin;
    loadSheet(win, "chrome://firebug/skin/inspector.css", "author");
    loadSheet(win, "chrome://firebug/skin/toolbox.css", "author");
    loadSheet(win, "chrome://firebug/skin/toolbars.css", "author");

    // xxxHonza: try to wire up the built-in ToolSidebar API
    // for every panel. The API should be nicely wrapped
    // in DevTools SDK.
    let prefName = "devtools.inspector.activeSidebar";
    let defaultTab = Services.prefs.getCharPref(prefName);
    let sidebar = this.panel.sidebar;

    // Append DOM side panel.
    sidebar.addTab("dom", self.data.url("dom.html"),
      "dom" == defaultTab);

    // Wait till the side panel iframe is loaded.
    sidebar.once("dom-ready", () => {
      let tab = sidebar.getTab("dom");
      let iframe = tab.querySelector(".iframe-dom");
      this.domPanelReady(iframe);
    });

    // Register selection change listener.
    this.onNodeSelected = this.onNodeSelected.bind(this);
    this.panel.selection.on("new-node-front", this.onNodeSelected);
  },

  destroy: function() {
  },

  onNodeSelected: function() {
    Trace.sysout("inspectorOverlay.onNodeSelected;", this.panel.selection);

    this.updateDomPanel(this.panel.selection.nodeFront);
  },

  domPanelReady: function(iframe) {
    Trace.sysout("inspectorOverlay.domPanelReady;", iframe);

    this.domPanelNode = iframe.contentDocument.body;
    this.updateDomPanel(this.panel.selection.nodeFront);

    let doc = iframe.contentDocument;
    doc.documentElement.classList.add("theme-firebug");

    let win = iframe.contentWindow;
    loadSheet(win, "chrome://firebug/skin/domTree.css", "author");
  },

  updateDomPanel: function(nodeFront) {
    if (!this.domPanelNode)
      return;

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

          let cache = new DomCache(threadClient);
          let provider = new DomProvider(cache);
          this.tree = new DomTree(provider);
          this.tree.replace(this.domPanelNode, {object: grip});
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
    let doc = this.panel._markupFrame.contentDocument;
    doc.documentElement.classList.add("theme-firebug");
    doc.documentElement.classList.remove("theme-light");

    // An iframe for the MarkupView has been loaded, so it's
    // time to register Firebug theme.
    let win = this.panel._markupFrame.contentWindow;
    loadSheet(win, "chrome://firebug/skin/markup-view.css", "author");
  }
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
