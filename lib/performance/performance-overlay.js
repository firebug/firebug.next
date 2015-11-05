/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the 'Performance' panel.
 */
const PerformanceOverlay = Class(
/** @lends PerformanceOverlay */
{
  extends: BaseOverlay,

  overlayId: "performance",

  // Initialization

  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);
  },

  destroy: function() {
  },

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/performance.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/performance.css", "author");
  },

  // Options

  /**
   * The performance panel uses the original popup menu already
   * populated with all options since its XUL structure is
   * wired with the JS logic. See: devtools/client/performance/performance.xul
   */
  getOptionsMenuPopup: function() {
    let doc = this.getPanelDocument();
    return doc.getElementById("performance-options-menupopup");
  },
});

// Exports from this module
exports.PerformanceOverlay = PerformanceOverlay;
