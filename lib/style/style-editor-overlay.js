/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");

const PREF_MEDIA_SIDEBAR = "devtools.styleeditor.showMediaSidebar";
const PREF_ORIG_SOURCES = "devtools.styleeditor.source-maps-enabled";

Cu.import("resource://gre/modules/Services.jsm");

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

  // Theme
  onApplyTheme: function(iframeWin, oldTheme) {
    loadSheet(iframeWin, "chrome://firebug/skin/style-editor.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(iframeWin, "chrome://firebug/skin/style-editor.css", "author");
  },

  // Options
  getOptionsMenuItems: function() {
    let items = [];

    items.push({
      id: "options-origsources",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_ORIG_SOURCES),
      label: "showOriginalSources.label",
      accesskey: "showOriginalSources.accesskey",
      command: this.panel.UI._toggleOrigSources
    });

    items.push({
      id: "options-show-media",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_MEDIA_SIDEBAR),
      label: "showMediaSidebar.label",
      accesskey: "showMediaSidebar.accesskey",
      command: this.panel.UI._toggleMediaSidebar
    });

    return items;
  },
});

// Exports from this module
exports.StyleEditorOverlay = StyleEditorOverlay;
