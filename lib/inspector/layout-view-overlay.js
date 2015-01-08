/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { SidePanelOverlay } = require("../chrome/side-panel-overlay.js");
const { Menu } = require("../chrome/menu.js");

/**
 * @overlay This object represents an overlay for 'Box Model'
 * side panel. It should implement all customization and new
 * features related to this side panel.
 */
const LayoutViewOverlay = Class(
/** @lends LayoutViewOverlay */
{
  extends: SidePanelOverlay,

  // Initialization

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("layoutViewOverlay.initialize;", options);
  },

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("layoutViewOverlay.initialize;", options);

    this.panel = this.panelFrame.contentWindow.layoutview;
  },

  destroy: function() {
    SidePanelOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("layoutViewOverlay.destroy;", arguments);
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
    ];
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/layout-view.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/layout-view.css", "author");
  },
});

// Exports from this module
exports.LayoutViewOverlay = LayoutViewOverlay;
