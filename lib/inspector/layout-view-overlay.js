/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { SidePanelOverlay } = require("firebug.sdk/lib/side-panel-overlay.js");
const { Menu } = require("firebug.sdk/lib/menu.js");

/**
 * @overlay This object represents an overlay for 'Box Model'
 * side panel. It should implement all customization and new
 * features related to this side panel.
 */
const LayoutViewOverlay = Class(
/** @lends LayoutViewOverlay */
{
  extends: SidePanelOverlay,

  overlayId: "layoutview",

  // Initialization

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("layoutViewOverlay.initialize;", options);

    this.panel = this.panelFrame.contentWindow.layoutview;
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
    ];
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    SidePanelOverlay.prototype.onApplyTheme.apply(this, arguments);

    loadSheet(win, "chrome://firebug/skin/layout-view.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    SidePanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    removeSheet(win, "chrome://firebug/skin/layout-view.css", "author");
  },
});

// Exports from this module
exports.LayoutViewOverlay = LayoutViewOverlay;
