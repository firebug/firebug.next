/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the 'Style Editor' panel.
 */
const ProfilerOverlay = Class(
/** @lends ProfilerOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("profilerOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("profilerOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("profilerOverlay.destroy;", arguments);
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    loadSheet(iframeWin, "chrome://firebug/skin/profiler.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(iframeWin, "chrome://firebug/skin/profiler.css", "author");
  },
});

// Exports from this module
exports.ProfilerOverlay = ProfilerOverlay;
