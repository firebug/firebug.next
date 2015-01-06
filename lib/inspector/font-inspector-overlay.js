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
 * all customizations and new features implemented for this side panel.
 *
 * this.owner => {@InspectorOverlay}
 * this.owner.panel => {@InspectorPanel}
 * this.owner.panel.sidebar => {@ToolSidebar}
 * this.panelFrame => "chrome://browser/content/devtools/fontinspector/font-inspector.xhtml"
 * this.panelFrame.contentWindow.fontInspector => {@FontInspector}
 *
 * {@FontInspector} represents the built-in side panel object included in
 * font-inspector.xhtml. Instance of this object is created in
 * window.setPanel method (implemented in font-inspector.js) that
 * is executed by {@ToolSidebar} when this side-panel's iframe is loaded.
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
      this.showAllFontsOption(),
    ];
  },

  showAllFontsOption: function() {
    return {
      label: "inspector.option.showAllFonts",
      tooltiptext: "inspector.option.tip.showAllFonts",
      command: this.panel.showAll.bind(this.panel)
    };
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/font-inspector.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/font-inspector.css", "author");

    let doc = this.getPanelDocument();
    let fontURLs = doc.querySelectorAll(".is-remote .font-url");

    for (let fontURL of fontURLs) {
      let inputBox = doc.createElement("input");
      inputBox.setAttribute("class", "font-url");
      inputBox.setAttribute("readonly", "readonly");
      inputBox.value = fontURL.textContent;
      fontURL.parentElement.insertBefore(inputBox, fontURL);
      fontURL.parentElement.removeChild(fontURL);
    }
  },

  // FontInspector side panel Events

  onNewNode: function() {
    let doc = this.getPanelDocument();

    if (!doc)
      return;

    let inputBoxes = doc.querySelectorAll(".is-remote .font-url");

    for (let inputBox of inputBoxes) {
      let div = doc.createElement("div");
      div.setAttribute("class", "font-url");
      div.textContent = inputBox.value;
      inputBox.parentElement.insertBefore(div, inputBox);
      inputBox.parentElement.removeChild(inputBox);
    }
  }
});

// Exports from this module
exports.FontInspectorOverlay = FontInspectorOverlay;
