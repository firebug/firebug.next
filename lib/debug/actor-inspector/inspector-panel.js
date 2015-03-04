/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");
const simplePrefs = require("sdk/simple-prefs");

const { Cu, Ci } = require("chrome");
const { target } = require("../../target.js");
const { defer, all } = require("sdk/core/promise");
const { BasePanel } = require("../../chrome/base-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Locale } = require("../../core/locale.js");
const { InspectorService } = require("./inspector-service.js");
const { Theme } = require("../../chrome/theme.js");
const { PanelRegistrar } = require("../../chrome/panel-registrar.js");
const { RemoteLogging } = require("../../console/remote/logging.js");

// Side panels
const { PacketSidePanel } = require("./packet-side-panel.js");
const { EditorPanel } = require("./editor-panel.js");

// xxxHonza: part of the workaround for 1075490.
const panelId = "dev-panel-firebugsoftware-joehewitt-com-RDP";

/**
 * @panel TODO docs
 */
const InspectorPanel = Class(
/** @lends InspectorPanel */
{
  extends: BasePanel,

  label: Locale.$STR("actorInspector.panel.title"),
  tooltip: Locale.$STR("actorInspector.panel.tip"),
  icon: "./icon-16.png",
  url: "./actor-inspector/inspector.html",
  searchable: true,

  initialize: function(options) {
    BasePanel.prototype.initialize.apply(this, arguments);

    this.onSendPacket = this.onSendPacket.bind(this);
    this.onReceivePacket = this.onReceivePacket.bind(this);
  },

  setup: function({debuggee}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("inspectorPanel.setup;");

    InspectorService.addPacketListener(this);
  },

  destroy: function() {
    BasePanel.prototype.destroy.apply(this, arguments);

    InspectorService.removePacketListener(this);
  },

  onReady: function({target, type}) {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("inspectorPanel.onReady;", arguments);

    // Initialize content
    this.onRefresh();
  },

  onLoad: function() {
    BasePanel.prototype.onLoad.apply(this, arguments);

    Trace.sysout("inspectorPanel.onLoad;");
  },

  onError: function() {
    // xxxHonza: fix me:
    // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=980410#c16
    //BasePanel.prototype.onError.apply(this, arguments);

    Trace.sysout("inspectorPanel.onError;", arguments);
  },

  // Transport Listener

  onSendPacket: function(packet) {
    this.postCommand("send-packet", packet);
  },

  onReceivePacket: function(packet) {
    this.postCommand("receive-packet", packet);
  },

  // Actor Inspector Client

  getInspectorClients: function() {
    let deferred = defer();

    if (this.clients) {
      deferred.resolve(this.clients);
      return deferred.promise;
    }

    InspectorService.getInspectorClients(this.toolbox).then(clients => {
        this.clients = clients;
        deferred.resolve(this.clients);
    });

    return deferred.promise;
  },

  onSelection: function(object) {
    Trace.sysout("inspectorPanel.onSelection;", object);

    // xxxHonza: get the pane dynamically through chrome?
    //let panel = this.getSidePanel(PacketSidePanel.prototype.id);
    //panel.select(object);
    this.getSidePanels().forEach((SidePanel) => {
      let panel = this.getSidePanel(SidePanel.prototype.id);
      panel.select(object);
    });
  },

  // Side panels

  getSidePanels: function() {
    return [PacketSidePanel, EditorPanel];
  },

  // Commands

  /**
   * Returns list of buttons that should be displayed within
   * the panel toolbar.
   */
  getPanelToolbarButtons: function() {
    let buttons = [];

    // xxxHonza: localization
    buttons.push({
      nol10n: true,
      label: "Refresh",
      tooltiptext: "Refresh list of actors",
      command: this.onRefresh.bind(this)
    });

    buttons.push({
      nol10n: true,
      label: "Reload",
      tooltiptext: "Reload panel content",
      command: this.onReload.bind(this)
    });

    buttons.push({
      nol10n: true,
      label: "Clear",
      tooltiptext: "Clear panel content",
      command: this.onClear.bind(this)
    });

    buttons.push("-");

    buttons.push({
      nol10n: true,
      label: "Register",
      command: this.onRegister.bind(this)
    });

    buttons.push({
      nol10n: true,
      label: "Unregister",
      command: this.onUnregister.bind(this)
    });

    return buttons;
  },

  /**
   * Returns a list of menu items for panel options menu.
   */
  getOptionsMenuItems: function() {
    return this.getMenuButtonItems();
  },

  /**
   * Returns a list of menu items for panel context menu.
   */
  getContextMenuItems: function() {
    return this.getMenuButtonItems();
  },

  // Command handlers

  onReload: function() {
    Trace.sysout("inspectorPanel.onReload;");

    // panel-ready event is fired and handled by `onReady` method.
    this.panelFrame.contentWindow.location.reload();
  },

  onSearch: function(value) {
    this.postCommand("search", value);

    this.getSidePanels().forEach((SidePanel) => {
      let panel = this.getSidePanel(SidePanel.prototype.id);
      panel.postCommand("search", value);
    });
  },

  onRefresh: function() {
    Trace.sysout("inspectorPanel.onRefresh;");

    this.getInspectorClients().then(clients => {
      Trace.sysout("inspectorPanel.onRefresh; clients", clients);

      let globalActors = clients.global.getActors();
      let tabActors = clients.tab.getActors();

      all([globalActors, tabActors]).then(responses => {
        this.postCommand("refresh", responses);
      });
    });
  },

  onClear: function() {
    Trace.sysout("inspectorPanel.onClear;");
    this.postCommand("clear");
  },

  onRegister: function() {
    RemoteLogging.registerActors(this.toolbox);
  },

  onUnregister: function() {
    RemoteLogging.unregisterActors();
  },
});

// Panel Registration

/**
 * The Inspector panel is only available if the Firebug theme
 * is active and if Firebug runs in 'development' mode.
 */
target.on("onRegisterPanels", registrar => {
  updateRegistration(registrar);
});

target.on("onUnregisterPanels", registrar => {
  registrar.unregisterPanel(InspectorPanel);
});

simplePrefs.on("env", prefName => {
  updateRegistration(PanelRegistrar);
});

function updateRegistration(registrar) {
  let dev = (simplePrefs.prefs["env"] == "development");
  let theme = Theme.isFirebugActive();

  if (dev && theme) {
    registrar.registerPanel(InspectorPanel);
  }
  else {
    registrar.unregisterPanel(InspectorPanel);
  }
}

// Exports from this module
exports.InspectorPanel = InspectorPanel;
