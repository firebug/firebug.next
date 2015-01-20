/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// Remote Debugging Protocol API
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

// xxxHonza: do not hard-code the URL
const baseUrl = "resource://firebug-at-software-dot-joehewitt-dot-com/";

// Backend helpers
const { expectState, getTrace } = Cu.import(baseUrl + "lib/core/actor.js");

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
   * to this actor.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("monitorActor.attach;", arguments);

    this.state = "attached";
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Detach from this actor. Executed when the front (client) detaches
   * from this actor.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("monitorActor.detach;", arguments);

    this.state = "detached";
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // Actor API

  /**
   * A test remote method.
   */
  getGlobalActors: method(function() {
    let result = {};

    Trace.sysout("inspectorActor.getGlobalActors; connection ", this.conn);

    if (this.conn._actorPool) {
      result.actorPool = dumpPool(this.conn._actorPool);
    }

    result.extraPools = [];

    for each (let pool in this.conn._extraPools) {
      if (pool !== this.conn._actorPool) {
        result.extraPools.push(dumpPool(pool));
      }
    }

    return result;
  }, {
    request: {},
    response: RetVal("json"),
  }),
});

// Helpers

function dumpPool(pool) {
  let result = {};

  if (pool._actors) {
    pool.forEach(actor => {
      result[actor.actorID] = {
        actorID: actor.actorID,
        actorPrefix: actor.actorPrefix,
      }
    });
  } else {
    for (let p of Object.keys(pool)) {
      result[p] = pool[p] + "";
    }
  }

  return result;
}

function getMessageManager() {
  return Cc["@mozilla.org/globalmessagemanager;1"].getService(
    Ci.nsIMessageListenerManager);
}

// Exports from this module
exports.InspectorActor = InspectorActor;
