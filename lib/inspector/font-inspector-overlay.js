/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { SidePanelOverlay } = require("../chrome/sidePanelOverlay.js");
const { Menu } = require("../chrome/menu.js");

/**
 * @overlay This object represents an overlay for the 'Fonts' side
 * panel in the Inspector main panel. This object is responsible for
 * all customizations and new features implemented for the side panel.
 *
 * this.owner => {@InspectorOverlay}
 * this.owner.panel => {@FontInspector} (built-in) side panel
 * this.owner.panel.sidebar => {@ToolSidebar}
 */
const FontInspectorOverlay = Class(
/** @lends FontInspectorOverlay */
{
  extends: SidePanelOverlay,

  // Initialization

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("fontInspectorOverlay.initialize;", options);

    this.onNewNode = this.onNewNode.bind(this);
  },

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("fontInspectorOverlay.onReady;", options);

    // Reference to the original side panel.
    this.panel = this.panelFrame.contentWindow.fontInspector;

    // Handle update events.
    this.owner.panel.selection.on("new-node", this.onNewNode);
    this.owner.panel.sidebar.on("fontinspector-selected", this.onNewNode);
  },

  destroy: function() {
    SidePanelOverlay.prototype.destroy.apply(this, arguments);

    this.owner.panel.selection.off("new-node", this.onNewNode);
    this.owner.panel.sidebar.off("fontinspector-selected", this.onNewNode);

    Trace.sysout("fontInspectorOverlay.destroy;", arguments);
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
    ];
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/font-inspector.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/font-inspector.css", "author");
  },

  // FontInspector side panel Events

  onNewNode: function() {
    let doc = this.getPanelDocument();
    let inputBoxes = doc.querySelectorAll(".font-url");
    inputBoxes = Array.prototype.slice.call(inputBoxes, 0);
    let urls = inputBoxes.map(input => input.value);

    FBTrace.sysout("urls " + urls.join(", "), urls)

    // TODO: copy URLs to the right location in the UI
    // (as needed by Firebug theme). These new elements
    // should be removed in onUnapplyTheme method.
  }
});

// Exports from this module
exports.FontInspectorOverlay = FontInspectorOverlay;
