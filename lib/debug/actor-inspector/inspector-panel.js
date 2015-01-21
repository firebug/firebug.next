/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");

const { defer } = require("sdk/core/promise");
const { BasePanel } = require("../../chrome/base-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../../core/trace.js");//.get(module.id);
const { Tool } = require("dev/toolbox");
const { Locale } = require("../../core/locale.js");
const { EditorPanel } = require("./editor-panel.js");
const { InspectorService } = require("./inspector-service.js");

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

  setup: function({debuggee}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("inspectorPanel.setup;");
  },

  onReady: function({target, type}) {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("inspectorPanel.onReady;", arguments);

    try {
      // xxxHonza: "EventTargetInterposition.methods.addEventListener
      // error fired if index.js module is loaded first (see package.json)
      // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1123268
      this.debuggee.start();
      this.postMessage("RDP", [this.debuggee]);
    }
    catch (err) {
      TraceError.sysout("inspectorPanel.onReady; ERROR " + err, err);
    }

    // Load content script and handle 'onSendMessage' sent from it.
    let { messageManager } = this.panelFrame.frameLoader;
    let url = self.data.url("actor-inspector/inspector-content.js");
    messageManager.loadFrameScript(url, false);
    messageManager.addMessageListener("message", this.onMessage.bind(this));

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

  // Actor Inspector Client

  getInspectorClient: function() {
    let deferred = defer();

    if (this.actorInspectorClient) {
      deferred.resolve({client: this.actorInspectorClient});
      return deferred.promise;
    }

    InspectorService.getInspectorClient(this.toolbox).then(({client}) => {
      this.actorInspectorClient = client;
      deferred.resolve({client: this.actorInspectorClient});
    });

    return deferred.promise;
  },

  // Chrome <-> Content Communication

  postCommand: function(id, data) {
    let { messageManager } = this.panelFrame.frameLoader;

    messageManager.sendAsyncMessage("firebug/event/message", {
      type: "refresh",
      bubbles: false,
      cancelable: false,
      data: data,
      origin: this.url,
    });
  },

  onMessage: function(event) {
    Trace.sysout("inspectorPanel.onMessage; (from content)", event);
  },

  // Side panels

  getSidePanels: function() {
    return [EditorPanel];
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

  onRefresh: function() {
    Trace.sysout("inspectorPanel.onRefresh;");

    this.getInspectorClient().then(({client}) => {
      client.getGlobalActors().then(response => {
        this.postCommand("refresh", response);
      })
    });
  },
});

// Panel registration
// xxxHonza: register only in 'development' mode
const actorInspectorTool = new Tool({
  name: "Actor Inspector Tool",
  panels: {
    actorInspector: InspectorPanel
  }
});

// Exports from this module
exports.InspectorPanel = InspectorPanel;
