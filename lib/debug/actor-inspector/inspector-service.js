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

const { DebuggerClient } = Cu.import('resource://gre/modules/devtools/dbg-client.jsm', {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { on, off } = devtools["require"]("sdk/event/core");

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
    Trace.sysout("inspectorService.initialize;", arguments);

    // Transport listeners (key == debugger client instance)
    this.listeners = new Map();
    this.onDebuggerClientConnect = this.onDebuggerClientConnect.bind(this);

    on(DebuggerClient, "connect", this.onDebuggerClientConnect);
  },

  shutdown: function(Firebug) {
    Trace.sysout("inspectorService.shutdown;");

    off(DebuggerClient, "connect", this.onDebuggerClientConnect);

    this.unregisterActors();
  },

  // Toolbox Events

  onToolboxCreated: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxCreated;");

    let remotePromise = toolbox.target.makeRemote();
    let client = toolbox.target.client;
    let listener = new TransportListener({client});
    this.listeners.set(client, listener);

    client.addOneTimeListener("closed", event => {
      let listener = this.listeners.get(client);
      listener.destroy();
      this.listeners.delete(client);
    });
  },

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxReady;", toolbox);
  },

  onToolboxDestroy: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxDestroy;");
  },

  // Connection Events

  onDebuggerClientConnect: function(client) {
    Trace.sysout("inspectorService.onDebuggerClientConnect;", client);
  },

  // Packet Listeners

  addPacketListener: function(listener) {
    this.listeners.forEach((value, key) => {
      value.addListener(listener);
    });
  },

  removePacketListener: function(listener) {
    this.listeners.forEach((value, key) => {
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
