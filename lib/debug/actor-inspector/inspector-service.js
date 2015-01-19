/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const options = require("@loader/options");

const { target } = require("../../target.js");
const { System } = require("../../core/system.js");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Rdp } = require("../../core/rdp.js");

const { InspectorFront } = System.devtoolsRequire("./inspector-front.js");

// Make sure the Inspector panel object is loaded.
require("./inspector-panel.js");

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
    Trace.sysout("inspectorService.setup;");

    this.unregisterActors();
  },

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxReady;");

    // Register when the toolbox is opened fro the first time.
    this.registerActors(toolbox);
  },

  onToolboxDestroy: function(eventId, toolbox) {
    Trace.sysout("inspectorService.onToolboxDestroy;");
  },

  // Backend Actors

  registerActors: function(toolbox) {
    let moduleUrl = options.prefixURI +
      "lib/debug/actor-inspector/inspector-actor.js";

    // Bail out if the actor is already registered.
    if (this.inspectorRegistrar) {
      return;
    }

    // Inspector actor registration options.
    let inspectorOptions = {
      prefix: "inspectorActor",
      actorClass: "InspectorActor",
      frontClass: InspectorFront,
      type: { global: true },
      moduleUrl: moduleUrl
    };

    // Register inspector actor.
    Rdp.registerActorNew(toolbox, inspectorOptions).then(
      ({registrarActor, actorFront}) => {

      this.inspectorRegistrar = registrarActor;
    });
  },

  unregisterActors: function() {
    if (this.inspectorRegistrar) {
      this.inspectorRegistrar.unregister().then(() => {
        Trace.sysout("inspectoService.unregisterActors; inspector actor " +
          "unregistered", arguments);
      });
    }
  }
};

// Registration
target.register(InspectorService);
