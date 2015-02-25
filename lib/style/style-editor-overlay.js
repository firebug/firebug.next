/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { PanelToolbar, ToolbarButton } = require("../chrome/panel-toolbar.js");
const { Win } = require("../core/window.js");
const { Xul } = require("../core/xul.js");
const { SelectorPanel } = require("./selector-panel.js");
const { MediaPanel } = require("./media-panel.js");
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { ToolSidebar } = devtools["require"]("devtools/framework/sidebar");

const PREF_MEDIA_SIDEBAR = "devtools.styleeditor.showMediaSidebar";
const PREF_ORIG_SOURCES = "devtools.styleeditor.source-maps-enabled";

const { BOX, SPLITTER, TABBOX, TABS, TABPANELS } = Xul;

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the 'Style Editor' panel.
 *
 * Some info about the native structure of the Style Editor panel:
 *
 * this.panel => {@StyleEditorPanel}
 * this.panel.UI => {@StyleEditorUI}
 * this.panel.UI.editors => *{@StyleSheetEditor}
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

  onBuild: function(options) {
    BaseOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onBuild;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("styleEditorOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("styleEditorOverlay.destroy;", arguments);
  },

  // Side Panels

  getSidePanels: function() {
    return [SelectorPanel, MediaPanel];
  },

  // Theme

  // xxxHonza: it's called twice when the panel loads, why? FIX ME
  onApplyTheme: function(win, oldTheme) {
    Trace.sysout("styleEditorOverlay.onApplyTheme; " + win.location.href);

    loadSheet(win, "chrome://firebug/skin/style-editor.css", "author");
    Win.loaded(win).then(() => this.applyFirebugLayout(win));
  },

  onUnapplyTheme: function(win, newTheme) {
    Trace.sysout("styleEditorOverlay.onUnapplyTheme; " + win.location.href);

    removeSheet(win, "chrome://firebug/skin/style-editor.css", "author");
    Win.loaded(win).then(() => this.unapplyFirebugLayout(win));
  },

  applyFirebugLayout: function(win) {
    Trace.sysout("styleEditorOverlay.applyFirebugLayout;");

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
      if (items) {
        this.mainToolbar.createItems(items);
      }

      let splitter =
        SPLITTER({"id": "panelSplitter", "valign": "top",
          "orient": "horizontal", "class": "devtools-side-splitter"},
          BOX({"class": "panelSplitterBox"})
        );

      let tabbox =
        TABBOX({"id": "panelSideBox", "class": "devtools-sidebar-tabs",
          "handleCtrlTab": "false"},
            TABS(),
            TABPANELS({"flex": "1"})
        );

      let parentNode = doc.querySelector(".splitview-root");
      this.splitter = splitter.build(parentNode);
      this.tabbox = tabbox.build(parentNode);

      // Create side bar, the Style Editor panel doesn't have its own.
      // xxxHonza: as soon as there is a default side bar this part
      // must be adopted TESTME
      this.sidebar = new ToolSidebar(this.tabbox, this, this.overlayId);

      this.setupSidePanels();

      this.toggleSideBar = new ToggleSideBarButton({
        panel: this,
        toolbar: this.mainToolbar.toolbar,
      });
    }

    if (!this.splitterBox) {
      let splitter = doc.querySelector(
        ".devtools-side-splitter.splitview-landscape-splitter");
      this.splitterBox = BOX({"class": "panelSplitterBox"}).build(splitter);
    }
  },

  unapplyFirebugLayout: function(win) {
    Trace.sysout("styleEditorOverlay.unapplyFirebugLayout;");

    if (!this.mainToolbar) {
      return;
    }

    this.toggleSideBar.destroy();
    this.mainToolbar.remove();
    this.splitterBox.remove();
    this.splitter.remove();
    this.tabbox.remove();

    this.splitterBox = null;
    this.mainToolbar = null;
  },

  // Toolbar Buttons

  getPanelToolbarButtons: function() {
    let buttons = [];
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
