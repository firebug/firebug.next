/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const options = require("@loader/options");

const { defer } = require("sdk/core/promise");
const { target } = require("../../target.js");
const { Trace, TraceError } = require("../../core/trace.js");//.get(module.id);
const { Rdp } = require("../../core/rdp.js");
const { InspectorFront } = require("./inspector-front.js");

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
  },

  shutdown: function(Firebug) {
    Trace.sysout("inspectorService.shutdown;");

    this.unregisterActors();
  },

  onToolboxReady: function(eventId, toolbox) {
   Trace.sysout("inspectorService.onToolboxReady;");
  },

  onToolboxDestroy: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxDestroy;");
  },

  // Backend Actors

  registerInspectorActor: function(toolbox) {
    let deferred = defer();

    let moduleUrl = options.prefixURI +
      "lib/debug/actor-inspector/inspector-actor.js";

    // Inspector actor registration options.
    let inspectorOptions = {
      prefix: "actorInspector",
      actorClass: "InspectorActor",
      frontClass: InspectorFront,
      type: { global: true },
      moduleUrl: moduleUrl
    };

    Trace.sysout("inspectorService.registerActors;");

    // Register inspector actor.
    Rdp.registerActor(toolbox.target.client, inspectorOptions).then(
      ({registrarActor, actorFront}) => {

      // Remember for unregistration. Note that there registrar is
      // available only for the first time/toolbox when the actor is
      // actually registered on the backend.
      this.inspectorRegistrar = registrarActor;

      // Return client. A new instance created for every
      // connection/tab (even for global actors).
      deferred.resolve({client: actorFront});
    });

    return deferred.promise;
  },

  unregisterActors: function() {
    if (this.inspectorRegistrar) {
      this.inspectorRegistrar.unregister().then(() => {
        Trace.sysout("inspectoService.unregisterActors; inspector actor " +
          "unregistered", arguments);
      });
    }
  },

  // Accessors

  getInspectorClient: function(toolbox) {
    return this.registerInspectorActor(toolbox);
  }
};

// Registration
target.register(InspectorService);

// Exports from this module
exports.InspectorService = InspectorService;
