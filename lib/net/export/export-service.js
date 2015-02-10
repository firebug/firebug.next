/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { Menu } = require("../../chrome/menu.js");
const { Xul } = require("../../core/xul.js");
const { Exporter } = require("./exporter.js");

// Xul builder creators.
const { BOX, TOOLBARBUTTON, TABSCROLLBOX, MENUITEM } = Xul;

/**
 * TODO: docs
 */
const ExportService = Class(
/** @lends ExportService */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("ExportService.initialize;", options);

    this.netOverlay = options.overlay;

    this.onContextShowing = this.onContextShowing.bind(this);
    this.onCopyAsHar = this.onCopyAsHar.bind(this);
  },

  onReady: function(options) {
    Trace.sysout("ExportService.onReady;", options);

    let doc = this.netOverlay.getPanelDocument();
    let popup = doc.getElementById("network-request-popup");
    popup.addEventListener("popupshowing", this.onContextShowing, false);
  },

  destroy: function() {
  },

  // Context Menu

  onContextShowing: function() {
    let itemId = "firebug-copy-as-har";

    let doc = this.netOverlay.getPanelDocument();
    if (doc.getElementById(itemId)) {
      return;
    }

    let popup = doc.getElementById("network-request-popup");
    let item = doc.getElementById("request-menu-context-copy-image-as-data-uri");

    Menu.createMenuItem(popup, "-");

    Menu.createMenuItem(popup, {
      id: itemId,
      label: "net.export.copyAsHar",
      command: this.onCopyAsHar
    }, item);
  },

  // Panel Toolbar

  /**
   * Returns list of buttons for the Network panel toolbar.
   */
  getPanelToolbarButtons: function() {
    let buttons = [];
    buttons.push({
      label: "net.Export",
      tooltiptext: "net.tip.Export",
      command: this.onExport.bind(this)
    });
    return buttons;
  },

  // Commands

  onExport: function() {
    Trace.sysout("ExportService.onExport;");

    let context = this.netOverlay.getContext();
    let win = this.netOverlay.panelFrame.contentWindow;
    let items = win.NetMonitorView.RequestsMenu.items;

    Exporter.exportData(context, false, items);
  },

  onCopyAsHar: function() {
    Trace.sysout("ExportService.onCopyAsHar;");

    let context = this.netOverlay.getContext();
    let win = this.netOverlay.getPanelWindow();
    let selectedItem = win.NetMonitorView.RequestsMenu.selectedItem;

    Exporter.copyData(context, false, [selectedItem]);
  }
});

// Exports from this module
exports.ExportService = ExportService;
