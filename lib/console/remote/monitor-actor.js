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

// Remote Debugging Protocol API
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

// xxxHonza: do not hard-code the URL
// xxxHonza: The path should be: 'resource://firebug/lib/core/actor.js'
// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1081930
const baseUrl = "resource://firebug-at-software-dot-joehewitt-dot-com/";

// Backend helpers
const { expectState, getTrace } = Cu.import(baseUrl + "lib/core/actor.js");
const { getTopFrameElementForRequest } = Cu.import(baseUrl + "lib/console/remote/utils.js");

// TODO support FirePHP
const acceptableHeaders = ["x-chromelogger-data"];

const actorTypeName = "firebugMonitor";
const Trace = getTrace();

/**
 * @actor This object represents an HTTP network event observer.
 * It's registered as a global actor that runs in the parent process
 * in case of multiprocess browser. This is necessary since HTTP
 * events can't be observed inside a child process.
 * Events are consequently forwarded to {@LoggerActor} actor that is
 * running inside the child process.
 *
 * xxxHonza: this monitor is not necessary and doesn't have to be
 * registered if the browser doesn't support multiprocess (e10s)
 * feature. In such case {@LoggerActor} observes HTTP events itself.
 */
var MonitorActor = ActorClass(
/** @lends MonitorActor */
{
  typeName: actorTypeName,

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("monitorActor.initialize; parent: " +
      parent.actorID + ", conn: " + conn.prefix, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
    this.onExamineResponse = this.onExamineResponse.bind(this);
    this.onAttachChild = this.onAttachChild.bind(this);
    this.onDetachChild = this.onDetachChild.bind(this);

    let manager = getMessageManager();
    manager.addMessageListener("http-monitor:attach-child", this.onAttachChild);
    manager.addMessageListener("http-monitor:detach-child", this.onDetachChild);

    // Attached child loggers.
    this.targets = new Map();
  },

  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   */
  destroy: function() {
    Trace.sysout("monitorActor.destroy; state: " + this.state +
      ", "  + this.actorID, arguments);

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
    Trace.sysout("monitorActor.disconnect; state: " + this.state +
      ", " + this.actorID, arguments);

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
    Trace.sysout("monitorActor.attach; " + this.actorID, arguments);

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
    Trace.sysout("monitorActor.detach; " + this.actorID, arguments);

    this.state = "detached";

    Events.off("http-on-examine-response", this.onExamineResponse);

    let manager = getMessageManager();
    manager.removeMessageListener("http-monitor:attach-child", this.onAttachChild);
    manager.removeMessageListener("http-monitor:detach-child", this.onDetachChild);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  onAttachChild: function(event) {
    let winId = event.data.winId;
    let actorId = event.data.actorId;
    let childConnId = event.data.connId;

    // xxxHonza: the following condition is also related to bug:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1119790

    // xxxHonza: all message names between parent and child actors should
    // include connection prefix, just like ChildDebuggerTransport
    // (see transport.js) does, e.g.: "firebug:" + prefix + ":" + msg-name;
    // The question for extensions is how to get the parent process
    // connection prefix within the tab actor (child process).
    // The connection prefix in the child process is derived from the
    // connection prefix in the parent process and not the same.

    // Ignore messages coming from different connections
    if (!childConnId.startsWith(this.conn.prefix)) {
      return;
    }

    Trace.sysout("!!! monitorActor.onAttachChild; "  + this.actorID +
      ", win ID: " + winId + ", childId " + actorId +
      ", child connId: " + childConnId + ", monitor connId: " +
      this.conn.prefix, event);

    // Collect child loggers. The 'target' (XULElement) represents the
    // browser element associated with the content that this message
    // came from.
    this.targets.set(winId, {
      actorId: actorId,
      target: event.target
    });
  },

  onDetachChild: function(event) {
    let actorId = event.data.actorId;
    for (var [key, value] of this.targets) {
      if (value.actorId == actorId) {
        this.targets.delete(key);
        break;
      }
    }

    Trace.sysout("!!! monitorActor.onDetachChild; Child logger detached, " +
      this.actorID + ", rest of loggers: " + this.targets.size, event);

    // xxxHonza: if the child (there is only one child) is detached,
    // stop listening to the HTTP-* events.
  },

  // HTTP Observer

  onExamineResponse: function(event) {
    let { subject } = event;
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);

    Trace.sysout("monitorActor.onExamineResponse; " + httpChannel.name +
      ", " + this.actorID, this.targets);

    let requestFrame = getTopFrameElementForRequest(httpChannel);
    if (!requestFrame) {
      return;
    }

    // Chrome requests don't have a parent window.
    let win = requestFrame._contentWindow;
    if (!win) {
      return;
    }

    let winId = WindowUtils.getOuterId(win);
    let entry = this.targets.get(winId);
    if (!entry) {
      Trace.sysout("monitorActor.onExamineResponse; ERROR no child! " +
        winId + ", " + this.actorID, this.targets);
      return;
    }

    if (!entry.target) {
      Trace.sysout("monitorActor.onExamineResponse; ERROR no target! " +
        entry.actorId);
      return;
    }

    let { messageManager } = entry.target;
    if (!messageManager) {
      Trace.sysout("monitorActor.onExamineResponse; ERROR no " +
        "message manager! " + entry.actorId);
      return;
    }

    let headers = [];

    httpChannel.visitResponseHeaders((header, value) => {
      header = header.toLowerCase();
      if (acceptableHeaders.indexOf(header) !== -1) {
        headers.push({header: header, value: value});
      }
    });

    messageManager.sendAsyncMessage("http-monitor:examine-headers", {
      monitorId: this.actorID,
      headers: headers,
      connId: this.conn.prefix
    });

    Trace.sysout("monitorActor.onExamineResponse; headers " +
      headers.length + ", win id: " + winId, headers);
  },
});

// Helpers

function getMessageManager() {
  return Cc["@mozilla.org/globalmessagemanager;1"].getService(
    Ci.nsIMessageListenerManager);
}

// Exports from this module
exports.MonitorActor = MonitorActor;
