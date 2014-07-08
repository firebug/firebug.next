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

Cu.import("resource://gre/modules/Services.jsm");

/**
 * @overlay This object is responsible for the Inspector panel
 * customization. It appends a DOM side panel displaying properties
 * of the selected node among other things.
 */
const InspectorOverlay = Class(
/** @lends InspectorOverlay */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("InspectorOverlay.initialize;", options);
  },

  onReady: function(options) {
    Trace.sysout("InspectorOverlay.onReady;", options);

    this.panel = options.panel;
    this.toolbox = options.toolbox;

    let doc = this.panel.panelWin.document;
    doc.documentElement.classList.add("theme-firebug");
    doc.documentElement.classList.remove("theme-light");

    let win = this.panel.panelWin;
    loadSheet(win, self.data.url("firebug-theme/inspector.css", "author"));
    loadSheet(win, self.data.url("firebug-theme/toolbox.css", "author"));
    loadSheet(win, self.data.url("firebug-theme/toolbars.css", "author"));

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
    loadSheet(win, self.data.url("firebug-theme/domTree.css", "author"));
  },

  updateDomPanel: function(nodeFront) {
    if (!this.domPanelNode)
      return;

    this.toolbox.initInspector().then(() => {
      Trace.sysout("inspectorOverlay.onNodeSelected; nodeFront",
        nodeFront);

      // xxxHonza: blocked by platform
      // let walker = this.toolbox.walker;
      // let objectActor = walker.getNodeActorFromObjectActor();
      // let provider = new DomProvider(this.toolbox.walker);
      this.tree = new DomTree(/*provider*/);
      this.tree.replace(this.domPanelNode, {object: nodeFront});
    });
  }
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
