/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Options panel.
 */
const MemoryOverlay = Class(
/** @lends MemoryOverlay */
{
  extends: BaseOverlay,

  overlayId: "memory",

  // Initialization

  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("MemoryOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("MemoryOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("MemoryOverlay.destroy;", arguments);
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    loadSheet(iframeWin, "chrome://firebug/skin/memory.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(iframeWin, "chrome://firebug/skin/memory.css", "author");
  },
});

// Exports from this module
exports.MemoryOverlay = MemoryOverlay;
