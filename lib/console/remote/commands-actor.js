/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true */

"use strict";

const { Cc, Ci, Cu } = require("chrome");
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

const protocol = devtools["require"]("devtools/server/protocol");

const { method, RetVal, ActorClass, Actor } = protocol;
const { WebConsoleCommands } = devtools["require"]("devtools/toolkit/webconsole/utils");
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});

// xxxHonza: do not hard-code the URL
// xxxHonza: The path should be: 'resource://firebug/lib/core/actor.js'
// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1081930
const baseUrl = "resource://firebug-at-software-dot-joehewitt-dot-com/";

const { expectState, getTrace } = Cu.import(baseUrl + "lib/core/actor.js");
const Trace = getTrace(DebuggerServer.parentMessageManager);

const actorTypeName = "firebugCommands";

/**
 * Commands we want to register.
 */
let commands = {
  dir: function(owner, ...args) {
    owner.window.console.dir(...args);
  },
  dirxml: function(owner, ...args) {
    owner.window.console.dirxml(...args);
  }
};

/**
 * @actor The actor is responsible for the registration of Firebug-specific
 * commands or for the extension of the built-in commands.
 */
let CommandsActor = ActorClass(
/** @lends CommandsActor */
{
  typeName: actorTypeName,
  parent: null,
  state: null,

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("commandsActor.initialize; parent: " + parent.actorID +
      ", conn: " + conn.prefix + ", " + this.actorID + ", child: " +
      DebuggerServer.isInChildProcess, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
  },

  /**
   * Attach to this actor. Executed when the front (client) is attaching
   * to this actor in order to register commands.
   *
   * This methods use the WebConsoleCommands API to add new commands
   * to the bindings of the commands evaluation.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("commandsActor.attach; child process: ", arguments);
    this.state = "attached";

    for (let name in commands) {
      if (commands.hasOwnProperty(name)) {
        WebConsoleCommands.register(name, commands[name]);
      }
    }
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),


  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   *
   * It unregisters the commands using the WebConsoleCommands API.
   */
  destroy: function() {
    Trace.sysout("commandsActor.destroy; state: " + this.state +
      ", " + this.actorID, arguments);

    if (this.state === "attached") {
      this.detach();
    }

    for (let name in commands) {
      if (commands.hasOwnProperty(name)) {
        WebConsoleCommands.unregister(name);
      }
    }

    Actor.prototype.destroy.call(this);
  },
});

exports.CommandsActor = CommandsActor;
