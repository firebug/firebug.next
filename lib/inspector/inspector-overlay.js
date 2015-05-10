/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");
const { DomTree } = require("../dom/dom-tree.js");
const { DomProvider } = require("../dom/dom-provider.js");
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { Theme } = require("../chrome/theme.js");
const { Win } = require("../core/window.js");
const { DomSidePanel } = require("../dom/dom-side-panel.js");
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");
const { RuleViewOverlay } = require("./rule-view-overlay.js");
const { ComputedViewOverlay } = require("./computed-view-overlay.js");
const { FontInspectorOverlay } = require("./font-inspector-overlay.js");
const { LayoutViewOverlay } = require("./layout-view-overlay.js");
const { AnimationInspectorOverlay } = require("./animation-inspector-overlay.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { SelectorSearch } = devtools["require"]("devtools/inspector/selector-search");

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

  searchable: true,

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

    this.originalsetupSearchBox = this.panel.setupSearchBox;
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("inspectorOverlay.onReady;", options);

    // Register selection change listener.
    this.onNodeSelected = this.onNodeSelected.bind(this);
    this.panel.selection.on("new-node-front", this.onNodeSelected);

    if (Theme.isFirebugActive()) {
      this.updateSearchBox(true);
    }
  },

  destroy: function() {
    if (!this.panel) {
      return;
    }

    this.panel.off("markupview-render", this.onMarkupViewRender);
    this.panel.off("markuploaded", this.onMarkupViewLoaded);
  },

  // Side panels

  hasSidePanels: function() {
    return true;
  },

  setupSidePanels: function() {
    if (Theme.isFirebugActive()) {
      BaseOverlay.prototype.setupSidePanels.apply(this, arguments);
    }
  },

  getSidePanels: function() {
	// xxxHonza: The DOM side panel isn't yet implemented (see also issue #225) FIXME
    return null;//[DomSidePanel];
  },

  getSideOverlays: function() {
    return [
      {id: "ruleview", ctor: RuleViewOverlay},
      {id: "computedview", ctor: ComputedViewOverlay},
      {id: "fontinspector", ctor: FontInspectorOverlay},
      {id: "layoutview", ctor: LayoutViewOverlay},
      {id: "animationinspector", ctor: AnimationInspectorOverlay},
    ];
  },

  // Events

  onNodeSelected: function() {
    // Bail out if the panel is destroyed.
    if (!this.panel.toolbox) {
      return;
    }

    Trace.sysout("inspectorOverlay.onNodeSelected;",
      this.panel.selection);

    this.updateDomPanel(this.panel.selection.nodeFront);
  },

  updateDomPanel: function(nodeFront) {
    // xxxHonza: Attaching to the current thread at this moment
    // breaks the inspector highlighter.
    // See also: https://github.com/firebug/firebug.next/issues/150

    // Make sure we are attached to backend thread.
    /*let target = this.toolbox.target;
    target.activeTab.attachThread({}, (response, threadClient) => {

      // Make sure the inspector is initialized.
      this.toolbox.initInspector().then(() => {
        Trace.sysout("inspectorOverlay.onNodeSelected; nodeFront",
          nodeFront);

        let walker = this.toolbox.walker;

        // xxxHonza: Platform API needed, patch attached to the following bug:
        // Bug 1035742 - New API: WalkerFront.getObjectActorFromNodeActor()
        if (typeof walker.getObjectActorFromNodeActor == "undefined") {
          return;
        }

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
    });*/
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

    if (type != "element") {
      return;
    }

    let xpath = "";
    while (nodeFront) {
      let name = nodeFront.tagName ? nodeFront.tagName : "";
      xpath = name + "/" + xpath;
      nodeFront = nodeFront._parent;
    }

    node.setAttribute("title", xpath.toLowerCase());
  },

  onMarkupViewLoaded: function() {
    Trace.sysout("inspectorOverlay.onMarkupViewLoaded;");
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
    loadSheet(iframeWin, "chrome://firebug-os/skin/inspector.css", "author");

    Theme.customizeSideBarSplitter(iframeWin, true);

    // Create side bar toggle button.
    Win.loaded(iframeWin).then(doc => {
      this.toggleSideBar = new ToggleSideBarButton({
        panel: this,
        toolbar: doc.getElementById("inspector-toolbar"),
      });

      this.updateSearchBox(true);
    });

    this.setupSidePanels();
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(iframeWin, "chrome://firebug/skin/inspector.css", "author");
    removeSheet(iframeWin, "chrome://firebug-os/skin/inspector.css", "author");

    // Remove splitter customization
    Theme.customizeSideBarSplitter(iframeWin, false);

    this.toggleSideBar.destroy();

    this.removeSidePanels();

    Win.loaded(iframeWin).then(doc => {
      this.updateSearchBox(false);
    });
  },

  // Framework events

  onShow: function() {
    BaseOverlay.prototype.onShow.apply(this, arguments);

    if (Theme.isFirebugActive()) {
      this.updateSearchBox(true);
    }
  },

  onHide: function() {
    BaseOverlay.prototype.onHide.apply(this, arguments);

    // Unapply search-box customization when the Inspector panel
    // is hidden (unselected). The search box is shared among
    // panels and other customozation can apply.
    this.updateSearchBox(false);
  },

  // Search

  updateSearchBox: function(apply) {
    Win.loaded(this.chrome.toolbox.doc.defaultView).then(() => {
      if (!this.panel) {
        return;
      }

      let doc = this.getPanelDocument();
      let searchInput = doc.querySelector("#inspector-searchbox");

      if (apply) {
        this.chrome.searchBox.setValue(searchInput.value);

        this.panel.setupSearchBox = this.setupSearchBox.bind(
          this.panel, this.chrome);
      } else {
        this.panel.setupSearchBox = this.originalsetupSearchBox;
      }

      this.panel.setupSearchBox();
    });
  },

  /**
   * xxxHonza: monkey patch for the {@InspectorPanel} that connects
   * the panel to the shared search box UI.
   */
  setupSearchBox: function(chrome) {
    // Initiate the selectors search object.
    if (this.searchSuggestions) {
      this.searchSuggestions.destroy();
      this.searchSuggestions = null;
    }

    this.searchBox = chrome.searchBox.getInputBox();
    this.searchSuggestions = new SelectorSearch(this, this.searchBox);
  }
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
