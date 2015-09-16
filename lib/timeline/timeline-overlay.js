/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the 'Timeline' panel.
 */
const TimelineOverlay = Class(
/** @lends TimelineOverlay */
{
  extends: BaseOverlay,

  overlayId: "timeline",

  // Initialization
  initialize: function(options) {
    // xxxFlorent: is it useful just to trace? Should we remove this function?
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("timelineOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("timelineOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("timelineOverlay.destroy;", arguments);
  },

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/timeline.css", "author");
    loadSheet(win, "chrome://firebug/skin/panel-content.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/timeline.css", "author");
    removeSheet(win, "chrome://firebug/skin/panel-content.css", "author");
  }
});

// Exports from this module
exports.TimelineOverlay = TimelineOverlay;
