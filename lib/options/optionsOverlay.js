/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { BaseOverlay } = require("../chrome/baseOverlay.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Options panel.
 */
const OptionsOverlay = Class(
/** @lends OptionsOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("optionsOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("optionsOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("optionsOverlay.destroy;", arguments);
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    // TODO: apply Firebug theme styles
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    // TODO: unapply Firebug theme styles
  },
});

// Exports from this module
exports.OptionsOverlay = OptionsOverlay;
