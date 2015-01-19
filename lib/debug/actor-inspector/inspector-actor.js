/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");
const options = require("@loader/options");

// Remote Debugging Protocol API
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

// Backend helpers
const { expectState, getTrace } = Cu.import(options.prefixURI + "lib/core/actor.js");

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
});

// Helpers

function getMessageManager() {
  return Cc["@mozilla.org/globalmessagemanager;1"].getService(
    Ci.nsIMessageListenerManager);
}

// Exports from this module
exports.InspectorActor = InspectorActor;
