/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

var { target } = require("../../target.js");

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass } = protocol;

/**
 * A method decorator that ensures the actor is in the expected state before
 * proceeding. If the actor is not in the expected state, the decorated method
 * returns a rejected promise.
 *
 * @param String expectedState
 *        The expected state.
 *
 * @param Function method
 *        The actor method to proceed with when the actor is in the expected
 *        state.
 *
 * @returns Function
 *          The decorated method.
 */
function expectState(expectedState, method) {
  return function(...args) {
    if (this.state !== expectedState) {
      let msg = "Wrong State: Expected '" + expectedState + "', but current "
        + "state is '" + this.state + "'";
      return Promise.reject(new Error(msg));
    }

    return method.apply(this, args);
  };
}

/**
 * @actor The actor is responsible for detecting server side logs
 * within HTTP headers and sending them to the client.
 */
var LoggerActor = ActorClass(
/** @lends LoggerActor */
{
  typeName: "loggerActor",

  // Initialization

  initialize: function(conn, parent) {
    protocol.Actor.prototype.initialize.call(this, conn);

    Trace.sysout("myActor.initialize;", arguments);

    this.parent = parent;
    this.state = "detached";
    this._dbg = null;
  },

  destroy: function() {
    Trace.sysout("myActor.destroy;", arguments);

    if (this.state === "attached") {
      this.detach();
    }

    protocol.Actor.prototype.destroy.call(this);
  },

  get dbg() {
    if (!this._dbg) {
      this._dbg = this.parent.makeDebugger();
    }
    return this._dbg;
  },

  /**
   * Attach to this actor.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("myActor.attach;", arguments);

    this.dbg.addDebuggees();
    this.dbg.enabled = true;
    this.state = "attached";
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Detach from this actor.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("myActor.detach;", arguments);

    this.dbg.removeAllDebuggees();
    this.dbg.enabled = false;
    this._dbg = null;
    this.state = "detached";
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  /**
   * A test method.
   *
   * @returns object
   */
  hello: method(function() {
    Trace.sysout("myActor.hello;", arguments);

    let result = {
      msg: "Hello from the backend!"
    };

    return result;
  }, {
    request: {},
    response: RetVal("json"),
  }),
});

// Register actor on the back-end
// xxxHonza: remote device debugging requires dynamic actor installation.
// See also: 
// * https://bugzilla.mozilla.org/show_bug.cgi?id=977443
// * https://bugzilla.mozilla.org/show_bug.cgi?id=980481
target.on("initialize", Firebug => {
  DebuggerServer.registerModule(module.uri);
});

exports.register = function(handle) {
  handle.addTabActor(LoggerActor, "logger");
};

exports.unregister = function(handle) {
  handle.removeTabActor(LoggerActor, "logger");
};

// Exports from this module
exports.LoggerActor = LoggerActor;
