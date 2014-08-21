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
const StyleEditorOverlay = Class(
/** @lends StyleEditorOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("styleEditorOverlay.destroy;", arguments);
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    if (iframeWin.location.href.indexOf("styleeditor.xul") == -1)
      return;

    loadSheet(iframeWin, "chrome://firebug/skin/style-editor.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    if (iframeWin.location.href.indexOf("styleeditor.xul") == -1)
      return;

    removeSheet(iframeWin, "chrome://firebug/skin/style-editor.css", "author");
  },
});

// Exports from this module
exports.StyleEditorOverlay = StyleEditorOverlay;
