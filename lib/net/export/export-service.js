/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { Menu } = require("../../chrome/menu.js");
const { Events } = require("../../core/events.js");
const { Win } = require("../../core/window.js");
const { Exporter } = require("./exporter.js");
const { ExportUtils } = require("./export-utils.js");
const { HarUploader } = require("./har-uploader.js");
const { ScreenCopy } = require("./screen-copy.js");
const { Automation } = require("./automation.js");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");

/**
 * TODO: docs
 *
 * xxxHonza: needs to be implemented and registered as the Network
 * panel overlay.
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
      label: "netexport.copyAsHar",
      command: this.onCopyAsHar.bind(this)
    }, item);
  },

  // Panel Toolbar

  /**
   * Returns 'Export' button for the Network panel toolbar.
   */
  getPanelToolbarButtons: function() {
    let buttons = [];

    buttons.push({
      id: "netExport",
      label: "netexport.button.label.Export",
      tooltiptext: "netexport.button.tooltip.Export HTTP Tracing",
      type: "menu",
      items: [{
        id: "netExportSaveAs",
        label: "netexport.button.label.Save As",
        tooltiptext: "netexport.button.tooltip.Save As",
        command: this.onExport.bind(this)
      }, {
        id: "netExportSaveAsJsonp",
        label: "netexport.button.label.Save As JSONP",
        tooltiptext: "netexport.button.label.Save As JSONP",
        command: this.onExportJsonp.bind(this)
      }, {
        id: "netExportSendTo",
        label: "netexport.menu.label.Send To",
        tooltiptext: "netexport.menu.tooltip.Send To",
        command: this.onSend.bind(this)
      }, {
        label: "-",
        id: "netExportSeparator"
      }, {
        id: "netExportScreenCopy",
        label: "netexport.menu.label.Copy As Image",
        tooltiptext: "netexport.menu.tooltip.Copy As Image",
        command: this.onCopyAsImage.bind(this)
      }, {
        label: "-",
        id: "netExportSeparator2"
      }, {
        id: "netExportOptions",
        label: "netexport.menu.label.Options",
        items: this.getOptions.bind(this)
      }, {
        label: "-",
        id: "netExportOptionsSeparator"
      }, {
        id: "netExportOpenLogDir",
        label: "netexport.menu.label.OpenLogDir",
        tooltiptext: "netexport.menu.tooltip.OpenLogDir",
        command: this.onOpenLogDir.bind(this)
      }, {
        id: "netExportHelp",
        label: "netexport.menu.label.Help",
        tooltiptext: "netexport.menu.tooltip.Help",
        command: this.onHelp.bind(this)
      }]
    });

    return buttons;
  },

  getOptions: function() {
    let options = [];

    let isActive = Automation.isActive();
    let tooltiptext = isActive ?
      "netexport.menu.tooltip.Deactivate Auto Export" :
      "netexport.menu.tooltip.Activate Auto Export";

    options.push({
      id: "netExportAutoOption",
      type: "checkbox",
      checked: isActive,
      label: "netexport.menu.label.Auto Export",
      tooltiptext: tooltiptext,
      command: this.onAutoExport.bind(this)
    });

    options.push({
      label: "-",
      id: "netAutoExportSeparator",
    });

    options.push(Menu.optionMenu(
      "netexport.menu.label.Compress",
      "netexport.compress",
      "netexport.menu.tooltip.Compress"));

    options.push(Menu.optionMenu(
      "netexport.menu.label.includeResponseBodies",
      "netexport.includeResponseBodies",
      "netexport.menu.tooltip.includeResponseBodies"));

    options.push(Menu.optionMenu(
      "netexport.menu.label.Show Preview",
      "netexport.showPreview",
      "netexport.menu.tooltip.Show Preview"));

    options.push(Menu.optionMenu(
      "netexport.menu.label.Save Files",
      "netexport.saveFiles",
      "netexport.menu.tooltip.Save Files"));

    options.push({
      label: "-",
      id: "netExportSeparator3",
    });

    options.push({
      id: "netExportLogDir",
      label: "netexport.menu.label.Default Log Directory",
      tooltiptext: "netexport.menu.tooltip.Default Log Directory",
      command: this.onDefaultLogDir.bind(this)
    });

    return options;
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    Trace.sysout("ExportService.onApplyTheme;");

    loadSheet(win, "chrome://firebug/skin/net-export.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    Trace.sysout("ExportService.onUnapplyTheme;");

    removeSheet(win, "chrome://firebug/skin/net-export.css", "author");
  },

  // Commands

  onExport: function(event) {
    Trace.sysout("ExportService.onExport;");

    Events.cancelEvent(event);

    this.exportData(false);
  },

  onExportJsonp: function(event) {
    Trace.sysout("ExportService.onExportJsonp;");

    Events.cancelEvent(event);

    this.exportData(true);
  },

  exportData: function(jsonp) {
    let context = this.netOverlay.getContext();
    let win = this.netOverlay.panelFrame.contentWindow;
    let items = win.NetMonitorView.RequestsMenu.items;

    Exporter.manualExportData(context, jsonp, items);
  },

  onAutoExport: function(event) {
    Trace.sysout("ExportService.onAutoExport;", event);

    Events.cancelEvent(event);

    let active = Automation.isActive();
    if (Automation.isActive()) {
      Automation.deactivate(this.netOverlay.toolbox);
    } else {
      Automation.activate(this.netOverlay.toolbox);
    }
  },

  onSend: function(event) {
    Trace.sysout("ExportService.onSend;");

    Events.cancelEvent(event);

    let context = this.netOverlay.getContext();
    let win = this.netOverlay.panelFrame.contentWindow;
    let items = win.NetMonitorView.RequestsMenu.items;
    let panelDoc = this.netOverlay.getPanelDocument();

    HarUploader.upload(context, true, true, items, null, panelDoc);
  },

  onCopyAsImage: function(event) {
    Events.cancelEvent(event);

    let panelDoc = this.netOverlay.getPanelDocument();
    ScreenCopy.copyToClipboard(panelDoc);
  },

  onCopyAsHar: function(event) {
    Trace.sysout("ExportService.onCopyAsHar;");

    Events.cancelEvent(event);

    let context = this.netOverlay.getContext();
    let win = this.netOverlay.getPanelWindow();
    let selectedItem = win.NetMonitorView.RequestsMenu.selectedItem;

    Exporter.copyData(context, false, [selectedItem]);
  },

  onDefaultLogDir: function(event) {
    Trace.sysout("ExportService.onDefaultLogDir;", event);

    Events.cancelEvent(event);

    ExportUtils.onDefaultLogDir(event);
  },

  onOpenLogDir: function(event) {
    Trace.sysout("ExportService.onOpenLogDir;");

    Events.cancelEvent(event);

    var logDir = ExportUtils.getDefaultFolder();
    if (!logDir.exists()) {
       logDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0777", 8));
    }

    var path = logDir.QueryInterface(Ci.nsILocalFile).path;
    var fileLocal = Cc["@mozilla.org/file/local;1"].getService(Ci.nsILocalFile);
    fileLocal.initWithPath(path);
    fileLocal.launch();
  },

  onHelp: function(event) {
    Trace.sysout("ExportService.onHelp;");

    Events.cancelEvent(event);

    Win.openNewTab("http://www.softwareishard.com/blog/netexport/");
  },
});

// Exports from this module
exports.ExportService = ExportService;
