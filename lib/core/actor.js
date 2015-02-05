/* See license.txt for terms of usage */

"use strict";

/**
 * This file is loaded on the back-end (can be a remote device)
 * in a sandbox that doesn't have all usual globals and modules
 * (introduced by e.g. Add-on SDK).
 *
 * It can also be loaded in a child process if the backend runs on
 * multiprocess Gecko (e10s enabled).
 *
 * Also, remote devices can use various (old) versions of
 * Add-on SDK and the platform. So, be careful when using external
 * dependencies they don't have to exist (such as FBTrace).
 */

const Cu = Components.utils;

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
      let Trace = getTrace();
      Trace.sysout("actor.expectState; ERROR wrong state, expected '" +
        expectedState + "', but current state is '" + this.state + "'" +
        ", method: " + method);

      let msg = "Wrong State: Expected '" + expectedState + "', but current " +
        "state is '" + this.state + "'";

      return Promise.reject(new Error(msg));
    }

    try {
      return method.apply(this, args);
    } catch (err) {
      Cu.reportError("actor.js; expectState EXCEPTION " + err, err);
    }
  };
}

/**
 * Helper tracing object for backend scope (e.g. for actor objects).
 */
function Trace(messageManager) {
  this.messageManager = messageManager;
}

Trace.prototype = {
  sysout: function(msg, ...args) {
    // xxxHonza: tracing from the backend doesn't support conditionals.
    // Disable manually for now.
    return;
    try {
      let mm = this.messageManager;
      let sendSyncMessage = mm ? mm.sendSyncMessage : null;

      let scope = {};
      Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
      let FBTrace = scope.traceConsoleService.getTracer("extensions.firebug",
        sendSyncMessage);

      FBTrace.sysout(msg, args);
    }
    catch(err) {
      Cu.reportError(msg + " --- " + args.map(x => x.toString()).join(" ; "));
    }
  }
};

function getTrace(messageManager) {
  return new Trace(messageManager);
}

// Exports from this module
this.EXPORTED_SYMBOLS = ["expectState", "getTrace"];
