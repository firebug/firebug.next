/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the 'Performance' panel.
 */
const PerformanceOverlay = Class(
/** @lends PerformanceOverlay */
{
  extends: PanelOverlay,

  overlayId: "performance",

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
