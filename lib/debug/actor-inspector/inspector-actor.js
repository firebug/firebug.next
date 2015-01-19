/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// SDK API
const Events = require("sdk/system/events.js");
const { getTabForContentWindow, getBrowserForTab } = require("sdk/tabs/utils");
const WindowUtils = require("sdk/window/utils");

// Debugger
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});

// Devtools helper API
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const DevToolsUtils = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Remote Debugging Protocol API
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

// Backend helpers
const { expectState, getTrace } = Cu.import("resource://firebug-at-software-dot-joehewitt-dot-com/lib/core/actor.js");

const Trace = getTrace();

/**
 * @actor TODO docs
 */
var InspectorActor = ActorClass(
/** @lends InspectorActor */
{
  typeName: "actorInspector",

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("InspectorActor.initialize; parent: " +
      parent.actorID + ", conn: " + conn.prefix, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";

    let manager = getMessageManager();

    // Attached child loggers.
    this.targets = new Map();
  },

  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   */
  destroy: function() {
    Trace.sysout("InspectorActor.destroy; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }

    Actor.prototype.destroy.call(this);
  },

  /**
   * Automatically executed by the framework when the parent connection
   * is closed.
   */
  disconnect: function() {
    Trace.sysout("InspectorActor.disconnect; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }
  },

  /**
   * Attach to this actor. Executed when the front (client) is attaching
   * to this actor in order to receive server side logs.
   *
   * The main responsibility of this method is registering a listener for
   * "http-on-examine-response" events.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("InspectorActor.attach;", arguments);

    Events.on("http-on-examine-response", this.onExamineResponse);

    this.state = "attached";
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Detach from this actor. Executed when the front (client) detaches
   * from this actor since it isn't interested in server side logs
   * any more. So, let's remove the "http-on-examine-response" listener.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("InspectorActor.detach;", arguments);

    this.state = "detached";

    Events.off("http-on-examine-response", this.onExamineResponse);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),
});

// Helpers

function getMessageManager() {
  return Cc["@mozilla.org/globalmessagemanager;1"].getService(
    Ci.nsIMessageListenerManager);
}

// Exports from this module
exports.InspectorActor = InspectorActor;
