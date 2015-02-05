/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const options = require("@loader/options");

const { Cu, Ci } = require("chrome");
const { defer, all } = require("sdk/core/promise");
const { target } = require("../../target.js");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Rdp } = require("../../core/rdp.js");
const { InspectorFront } = require("./inspector-front.js");
const { TransportListener } = require("./transport-listener.js");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

// URL of the {@InspectorActor} module. This module will be
// installed and loaded on the backend.
const actorModuleUrl = options.prefixURI + "lib/debug/actor-inspector/inspector-actor.js";

/**
 * @service This object represents the 'Actor Inspector Service' that
 * can be used to inspect backend actors for the current connection.
 * This object is a singleton and there is only one instance created.
 *
 * This service is responsible for registering necessary back-end
 * actors and loading related UI (panels).
 *
 * This object is a singleton and there is only one instance created.
 */
const InspectorService =
/** @lends InspectorService */
{
  // Initialization

  initialize: function(Firebug) {
    Trace.sysout("inspectorService.setup;", arguments);

    // Connection hooks (key == connection prefix)
    this.hooks = new Map();

    this.onDebuggerClientConnect = this.onDebuggerClientConnect.bind(this);

    gDevTools.on("debugger-client-connect", this.onDebuggerClientConnect);
  },

  shutdown: function(Firebug) {
    Trace.sysout("inspectorService.shutdown;");

    gDevTools.off("debugger-client-connect", this.onDebuggerClientConnect);

    this.unregisterActors();
  },

  // Toolbox Events

  onToolboxCreate: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxCreate;");
  },

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxReady;", toolbox);
  },

  onToolboxDestroy: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxDestroy;");
  },

  // Debugger Client Events

  onToolboxCreateClient: function(eventId, toolbox, client) {
    Trace.sysout("inspectorService.onToolboxCreateClient;", arguments);

    let listener = new TransportListener({client});
    this.hooks.set(client, listener);
  },

  onToolboxDestroyClient: function(eventId, toolbox, client) {
    Trace.sysout("inspectorService.onToolboxDestroyClient;");

    let hook = this.hooks.get(client);
    hook.destroy();
    this.hooks.delete(client);
  },

  // Connection Events

  onDebuggerClientConnect: function(eventId, client) {
    Trace.sysout("inspectorService.onDebuggerClientConnect;", client);

    /*this.hooks.set(client, new TransportListener({client}));

    client.addOneTimeListener("closed", function() {
      let hook = this.hooks.get(client);
      hook.destroy();
      this.hooks.delete(client);
    });*/
  },

  // Packet Listeners

  addPacketListener: function(listener) {
    this.hooks.forEach((value, key) => {
      value.addListener(listener);
    });
  },

  removePacketListener: function(listener) {
    this.hooks.forEach((value, key) => {
      value.removeListener(listener);
    });
  },

  // Backend Actors

  registerInspectorActor: function(toolbox) {
    Trace.sysout("inspectorService.registerInspectorActor;");

    // Inspector actor registration options.
    let config = {
      prefix: "actorInspector",
      actorClass: "InspectorActor",
      frontClass: InspectorFront,
      moduleUrl: actorModuleUrl
    };

    let deferred = defer();
    let client = toolbox.target.client;

    // xxxHonza: the registration should be done in one step
    // using Rdp.registerActor() API

    // Register as global actor.
    let global = Rdp.registerGlobalActor(client, config).
      then(({registrar, front}) => {
        this.globalRegistrar = registrar;
        return front;
    });

    // Register as tab actor.
    let tab = Rdp.registerTabActor(client, config).
      then(({registrar, front}) => {
        this.tabRegistrar = registrar;
        return front;
    });

    // Wait till both registrations are done.
    all([global, tab]).then(results => {
      deferred.resolve({
        global: results[0],
        tab: results[1]
      });
    });

    return deferred.promise;
  },

  unregisterActors: function() {
    if (this.globalRegistrar) {
      this.globalRegistrar.unregister().then(() => {
        Trace.sysout("inspectoService.unregisterActors; global actor " +
          "unregistered", arguments);
      });
    }

    if (this.tabRegistrar) {
      this.tabRegistrar.unregister().then(() => {
        Trace.sysout("inspectoService.unregisterActors; tab actor " +
          "unregistered", arguments);
      });
    }
  },

  // Accessors

  /**
   * Returns client objects for both, global and tab inspector actors.
   *
   * @returns {Object} An object with two clients objects. The 'global'
   * property represents front to the global actor and the 'tab' property
   * represents front to the the tab (aka child) actor.
   */
  getInspectorClients: function(toolbox) {
    return this.registerInspectorActor(toolbox);
  }
};

// Registration
target.register(InspectorService);

// Exports from this module
exports.InspectorService = InspectorService;
