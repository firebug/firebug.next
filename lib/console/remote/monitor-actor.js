/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// Placeholder for tracing API.
// xxxHonza: conditional logging needed
var Trace = {
  sysout: function(msg, ...args) {
    // Disable logging
    return;

    try {
      let scope = {};
      Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
      let FBTrace = scope.traceConsoleService.getTracer("extensions.firebug");
      FBTrace.sysout(msg, args);
    }
    catch(err) {
      Cu.reportError(msg + " --- " + args.map(x => x.toString()).join(" ; "));
    }
  }
};

// SDK API
const Events = require("sdk/system/events.js");
const { getTabForContentWindow, getBrowserForTab } = require("sdk/tabs/utils");
const base64 = require("sdk/base64");
const WindowUtils = require("sdk/window/utils");
const { expectState } = Cu.import("resource://firebug-at-software-dot-joehewitt-dot-com/lib/core/actor.js");

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

// TODO support FirePHP
const acceptableHeaders = ["x-chromelogger-data"];

const actorTypeName = "firebugMonitor";

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

  // xxxHonza: this code is duplicated in {@MonitorActor} can we
  // share it somehow?
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

function getTabFromHttpChannel(httpChannel) {
  let topFrame = getTopFrameElementForRequest(httpChannel);
  if (!topFrame) {
    return;
  }

  // In case of in-process debugging (no e10s) the result topFrame
  // represents the content window.
  let winType = topFrame.Window;
  if (typeof winType != "undefined" && topFrame instanceof winType) {
    return getTabForContentWindow(topFrame);
  }

  // ... otherwise the topFrame represents the content window parent frame.
  let notificationBox = getAncestorByTagName(topFrame, "notificationbox");
  if (!notificationBox) {
    Trace.sysout("monitorActor.getTabFromHttpChannel; " +
      "notificationbox not found");
    return;
  }

  return notificationBox.ownerDocument.querySelector(
    "#tabbrowser-tabs [linkedpanel='" + notificationBox.id + "']");
}

function getTopFrameElementForRequest(request) {
  let loadContext = getRequestLoadContext(request);
  if (!loadContext) {
    return;
  }

  try {
    if (loadContext.topFrameElement) {
      return loadContext.topFrameElement;
    }
  } catch (err) {
  }

  try {
    if (loadContext.topWindow) {
      return loadContext.topWindow;
    }
  } catch (err) {
  }

  return null;
}

function getTopFrameElementForTarget(target) {
  let loadContext = target.loadContext;
  if (!loadContext) {
    return;
  }

  try {
    if (loadContext.topFrameElement) {
      return loadContext.topFrameElement;
    }
  } catch (err) {
  }

  try {
    if (loadContext.topWindow) {
      return loadContext.topWindow;
    }
  } catch (err) {
  }

  return null;
}

function getInnerId(window) {
  return window.QueryInterface(Ci.nsIInterfaceRequestor).
    getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;
}

function getRequestLoadContext(request) {
  try {
    if (request && request.notificationCallbacks) {
      return request.notificationCallbacks.getInterface(Ci.nsILoadContext);
    }
  } catch (exc) {
  }

  try {
    if (request && request.loadGroup && 
      request.loadGroup.notificationCallbacks) {
      return request.loadGroup.notificationCallbacks.
        getInterface(Ci.nsILoadContext);
    }
  } catch (exc) {
  }

  return null;
}

function getAncestorByTagName(node, tagName) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.localName && parent.tagName.toLowerCase() == tagName) {
      return parent;
    }
  }
  return null;
}

// Exports from this module
exports.MonitorActor = MonitorActor;
