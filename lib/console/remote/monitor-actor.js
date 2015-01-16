/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// SDK API
const Events = require("sdk/system/events.js");
const { getTabForContentWindow, getBrowserForTab } = require("sdk/tabs/utils");
const base64 = require("sdk/base64");
const WindowUtils = require("sdk/window/utils");

// Debugger
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});

// Devtools helper API
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const DevToolsUtils = devtools["require"]("devtools/toolkit/DevToolsUtils.js");
const NetworkHelper = devtools["require"]("devtools/toolkit/webconsole/network-helper");

// Remote Debugging Protocol API
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

// Backend helpers
const { expectState, getTrace } = Cu.import("resource://firebug-at-software-dot-joehewitt-dot-com/lib/core/actor.js");
const { getTopFrameElementForRequest } = Cu.import("resource://firebug-at-software-dot-joehewitt-dot-com/lib/console/remote/utils.js");

// TODO support FirePHP
const acceptableHeaders = ["x-chromelogger-data"];

const actorTypeName = "firebugMonitor";
const Trace = getTrace();

/**
 * @actor TODO: documentation
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
    Trace.sysout("monitorActor.destroy; state: " + this.state, arguments);

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
    Trace.sysout("monitorActor.disconnect; state: " + this.state, arguments);

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
    Trace.sysout("monitorActor.attach;", arguments);

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
    Trace.sysout("monitorActor.detach;", arguments);

    this.state = "detached";

    Events.off("http-on-examine-response", this.onExamineResponse);
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  onAttachChild: function(event) {
    let winId = event.data.winId;
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

    Trace.sysout("monitorActor.onAttachChild; Child logger attached " +
      "win ID: " + winId + ", child conn: " + childConnId +
      ", monitor conn: " + this.conn.prefix, event);

    // Collect child loggers. The 'target' (XULElement) represents the
    // browser element associated with the content that this message
    // came from.
    this.targets.set(event.data.winId, event.target);
  },

  onDetachChild: function(event) {
    Trace.sysout("monitorActor.onAttachChild; Child logger detached", event);

    this.targets.delete(event.data.winId, event.target);
  },

  // HTTP Observer

  onExamineResponse: function(event) {
    let { subject } = event;
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);

    Trace.sysout("monitorActor.onExamineResponse; " + httpChannel.name,
      httpChannel);

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
    let target = this.targets.get(winId);
    if (!target) {
      return;
    }

    let { messageManager } = target;
    if (!messageManager) {
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
