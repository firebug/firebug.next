/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true */

"use strict";

let main = require("../../main.js");
const { Rdp } = require("../../core/rdp.js");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { target } = require("../../target.js");
const options = require("@loader/options");
const { CommandsFront } = require("./commands-front.js");
const { defer } = require("sdk/core/promise");

/**
 * This module is responsible for dynamic registration of {@CommandsActor}
 * object on the backend. The registration is done through the
 * {@ActorRegistryFront} object that sends implementation source
 * code of the actor (over RDP) to the backend where it's evaluated.
 *
 * The {@CommandsActor} registers the Firebug-specific commands on the backend.
 */
let Commands =
/** @lends Commands */
{
  // Initialization
  initialize: function() {
    Trace.sysout("commands.initialize;");

    this.initDeferred = defer();
    return this.initDeferred.promise;
  },

  shutdown: function(Firebug) {
    Trace.sysout("commands.shutdown;");

    this.unregisterActors();
  },

  // Toolbox Events

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("commands.onToolboxReady;", toolbox);

    if (toolbox.target.client.traits.webConsoleCommands) {
      this.registerActors(toolbox);
    }
    else {
      Trace.sysout("commands.onToolboxReady; WebConsoleCommands API not " +
        "implemented on the back-end");
    }
  },

  onToolboxDestroy: function(eventId, target) {
    Trace.sysout("commands.onToolboxDestroy;", target);
    // Actors unregistration is done automatically when the toolbox is closed.
  },

  // Actor registration

  registerActors: function(toolbox) {
    // xxxHonza: as soon as: https://bugzilla.mozilla.org/show_bug.cgi?id=11119794
    // is fixed, the prefix isn't necessary (but keep back compatibility).
    let commandsOptions = {
      prefix: "firebugCommands",
      actorClass: "CommandsActor",
      frontClass: CommandsFront,
      type: { tab: true },
      moduleUrl: options.prefixURI + "lib/console/remote/commands-actor.js"
    };

    let client = toolbox.target.client;

    Rdp.registerActor(client, commandsOptions).then(({registrar, front}) => {
      if (registrar) {
        this.commandsRegistrar = registrar;
      }

      // Initialization done now.
      this.initDeferred.resolve(true);
    });

  },

  unregisterActors: function(toolbox) {
    if (this.commandsRegistrar) {
      this.commandsRegistrar.unregister().then(() => {
        Trace.sysout("remoteLogging.unregisterActors; commands actor " +
            "unregistered", arguments);
      });
    }
    this.commandsRegistrar = null;
  },
};

// Registration.
target.register(Commands);

// Exports from this module.
exports.Commands = Commands;
