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
 * @overlay TODO: description
 */
const ComputedViewOverlay = Class(
/** @lends ComputedViewOverlay */
{
  extends: SidePanelOverlay,

  // Initialization

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("computedViewOverlay.initialize;", options);
  },

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("computedViewOverlay.initialize;", options);

    this.panel = this.panelFrame.contentWindow.computedview;
  },

  destroy: function() {
    SidePanelOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("computedViewOverlay.destroy;", arguments);
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
    ];
  },

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/computed-view.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(win, "chrome://firebug/skin/computed-view.css", "author");
  },
});

// Exports from this module
exports.ComputedViewOverlay = ComputedViewOverlay;
