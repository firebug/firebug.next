/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");
const DevToolsUtils = devtools["require"]("devtools/toolkit/DevToolsUtils");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// xxxHonza: do not hard-code the URL
// xxxHonza: The path should be: 'resource://firebug/lib/core/actor.js'
// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1081930
const baseUrl = "resource://firebug-at-software-dot-joehewitt-dot-com/";

// Backend helpers
const { expectState, getTrace } = Cu.import(baseUrl + "lib/core/actor.js");

const actorTypeName = "harExportDriver";
const Trace = getTrace(DebuggerServer.parentMessageManager);

/**
 * @actor xxxHonza: TODO docs
 */
var ExportDriverActor = ActorClass(
/** @lends ExportDriverActor */
{
  typeName: actorTypeName,

  /**
   * Events emitted by this actor.
   */
  events: {
    "triggerExport": {
      type: "triggerExport",
    },
    "clear": {
      type: "clear",
    },
  },

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("ExportDriverActor.initialize; parent: " + parent.actorID +
      ", conn: " + conn.prefix + ", " + this.actorID + ", child: " +
      DebuggerServer.isInChildProcess, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
    this.api = new ExportDriverApi(this);
  },

  destroy: function() {
    Trace.sysout("ExportDriverActor.destroy; state: " + this.state +
      ", " + this.actorID, arguments);

    if (this.state === "attached") {
      this.detach();
    }

    Actor.prototype.destroy.call(this);
  },

  disconnect: function() {
    Trace.sysout("ExportDriverActor.disconnect; state: " + this.state +
      ", " + this.actorID, arguments);

    if (this.state === "attached") {
      this.detach();
    }
  },

  attach: method(expectState("detached", function() {
    Trace.sysout("ExportDriverActor.attach;", arguments);

    this.state = "attached";

    let notifyMask = Ci.nsIWebProgress.NOTIFY_STATUS |
      Ci.nsIWebProgress.NOTIFY_STATE_WINDOW |
      Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT;

    this.parent.webProgress.addProgressListener(this, notifyMask);
    this.exposeToContent(this.parent.originalWindow);
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  detach: method(expectState("attached", function() {
    Trace.sysout("ExportDriverActor.detach; " + this.actorID, arguments);

    this.state = "detached";

    this.parent.webProgress.removeProgressListener(this);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // onWebProgressListener

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIWebProgressListener,
    Ci.nsISupportsWeakReference,
    Ci.nsISupports,
  ]),

  onStateChange: method(expectState("attached", function(aProgress, aRequest,
    aFlag, aStatus) {

    let isStart = aFlag & Ci.nsIWebProgressListener.STATE_START;
    let isStop = aFlag & Ci.nsIWebProgressListener.STATE_STOP;
    let isDocument = aFlag & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT;
    let isWindow = aFlag & Ci.nsIWebProgressListener.STATE_IS_WINDOW;
    let isTransferring = aFlag & Ci.nsIWebProgressListener.STATE_TRANSFERRING;

    Trace.sysout("ExportDriverActor.onStateChange; " + this.actorID +
      " start: " + isStart + ", stop: " + isStop + ", window: " +
      isWindow + ", document: " + isDocument + ", transferring: " +
      isTransferring, arguments);

    let win = aProgress.DOMWindow;
    if (isDocument && isTransferring) {
      this.exposeToContent(win);
    }
  })),

  exposeToContent: function(win) {
    Trace.sysout("ExportDriverActor.exposeToContent; " + win.location.href);

    exportIntoContentScope(win, this.api, "NetExport");
  }
});

// Export Driver API

function ExportDriverApi(actor) {
  this.triggerExport = function() {
    Trace.sysout("ExportDriverApi.triggerExport;");

    actor.conn.send({
      from: actor.actorID,
      type: "triggerExport",
    });
  };

  this.clear = function() {
    Trace.sysout("ExportDriverApi.clear;");

    actor.conn.send({
      from: actor.actorID,
      type: "clear",
    });
  };
}

// Helpers

// xxxHonza: duplicated in core/content, but that module is not available
// on the backend.
function exportIntoContentScope(win, obj, defineAs) {
  var clone = Cu.createObjectIn(win, {
    defineAs: defineAs
  });

  var props = Object.getOwnPropertyNames(obj);
  for (var i=0; i<props.length; i++) {
    var propName = props[i];
    var propValue = obj[propName];
    if (typeof propValue == "function") {
      Cu.exportFunction(propValue, clone, {
        defineAs: propName
      });
    }
  }
}

// Exports from this module
exports.ExportDriverActor = ExportDriverActor;
