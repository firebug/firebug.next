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
 * for customizing the Options panel.
 */
const MemoryOverlay = Class(
/** @lends MemoryOverlay */
{
  extends: PanelOverlay,

  overlayId: "memory",

  onApplyTheme: function(iframeWin, oldTheme) {
    PanelOverlay.prototype.onApplyTheme.apply(this, arguments);

    loadSheet(iframeWin, "chrome://firebug/skin/memory.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    PanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    removeSheet(iframeWin, "chrome://firebug/skin/memory.css", "author");
  },
});

// Exports from this module
exports.MemoryOverlay = MemoryOverlay;
