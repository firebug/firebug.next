/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { PanelToolbar } = require("../chrome/panelToolbar.js");
const { Win } = require("../core/window.js");
const { Theme } = require("../chrome/theme.js");
const { Xul } = require("../core/xul.js");

const PREF_MEDIA_SIDEBAR = "devtools.styleeditor.showMediaSidebar";
const PREF_ORIG_SOURCES = "devtools.styleeditor.source-maps-enabled";

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const { BOX } = Xul;

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
  onApplyTheme: function(win, oldTheme) {
    Trace.sysout("styleEditorOverlay.onApplyTheme; " + win.location.href);

    loadSheet(win, "chrome://firebug/skin/style-editor.css", "author");

    Win.loaded(win).then(() => this.applyFirebugLayout(win));
  },

  // xxxHonza: it's called twice when the panel loads, why?
  onUnapplyTheme: function(win, newTheme) {
    Trace.sysout("styleEditorOverlay.onUnapplyTheme; " + win.location.href);

    removeSheet(win, "chrome://firebug/skin/style-editor.css", "author");

    Win.loaded(win).then(() => this.unapplyFirebugLayout(win));
  },

  applyFirebugLayout: function(win) {
    let doc = win.document;

    // Create panel toolbar and populate it with buttons.
    if (!this.mainToolbar) {
      let details = doc.querySelector(".splitview-side-details");
      this.mainToolbar = new PanelToolbar({
        parentNode: details,
        insertBefore: details.firstChild,
      });

      // Get panel toolbar buttons
      let items = this.getPanelToolbarButtons();
      if (items)
        this.mainToolbar.createItems(items);
    }

    if (!this.splitterBox) {
      let splitter = doc.querySelector(
        ".devtools-side-splitter.splitview-landscape-splitter");
      this.splitterBox = BOX({"class": "panelSplitterBox"}).build(splitter);
    }
  },

  unapplyFirebugLayout: function(win) {
    let doc = win.document;

    this.mainToolbar.remove();
    this.splitterBox.remove();
  },

  // Toolbar Buttons

  getPanelToolbarButtons: function() {
    var buttons = [];
    return buttons;
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
