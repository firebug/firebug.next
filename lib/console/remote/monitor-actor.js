/* See license.txt for terms of usage */

"use strict";

const { Cc, Ci, Cu } = require("chrome");

// Placeholder for tracing API.
// xxxHonza: conditional logging needed
var Trace = {
  sysout: function(msg, ...args) {
    try {
      // Cu.reportError(msg + " --- " + args.map(x => x.toString()).join(" ; "));

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

const Events = require("sdk/system/events.js");
const { getTabForContentWindow, getBrowserForTab }  = require("sdk/tabs/utils");
const base64 = require("sdk/base64");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;
const DevToolsUtils = devtools.require("devtools/toolkit/DevToolsUtils.js");

// TODO support FirePHP
const acceptableHeaders = ["x-chromelogger-data"];

// xxxHonza: duplicated in logger-actor module.
function expectState(expectedState, method) {
  return function(...args) {
    if (this.state !== expectedState) {
      let msg = "Wrong State: Expected '" + expectedState + "', but current " +
        "state is '" + this.state + "'";
      return Promise.reject(new Error(msg));
    }

    try {
      return method.apply(this, args);
    } catch (err) {
      Trace.sysout("monitorActor EXCEPTION " + err, err);
    }
  };
}

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
    Trace.sysout("monitorActor.initialize;", this);

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
    Trace.sysout("monitorActor.onAttachChild; Child logger attached", event);

    // Collect child loggers.
    this.targets.set(event.data.actorID, event.target);
  },

  onDetachChild: function(event) {
    Trace.sysout("monitorActor.onAttachChild; Child logger detached", event);

    this.targets.remove(event.data.actorID, event.target);
  },

  // HTTP Observer

  // xxxHonza: this code is duplicated in {@MonitorActor} can we
  // share it somehow?
  onExamineResponse: function(event) {
    let { subject } = event;
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    let tab = getTabFromHttpChannel(subject);

    Trace.sysout("monitorActor.onExamineResponse; " + httpChannel.name +
      ", tab: " + tab, httpChannel);

    if (!tab) {
      return;
    }

    let headers = [];

    httpChannel.visitResponseHeaders((header, value) => {
      header = header.toLowerCase();
      if (acceptableHeaders.indexOf(header) !== -1) {
        headers.push({header: header, value: value});
      }
    });

    this.targets.forEach(value => {
      let { messageManager } = value;

      // Only send the message to the logger the lives within
      // the request's parent browser tab.
      messageManager.sendAsyncMessage("http-monitor:examine-headers", {
        headers: headers
      });
    });

    Trace.sysout("monitorActor.onExamineResponse; headers " +
      headers.length, headers);
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
  if (!loadContext)
    return;

  try {
    if (loadContext.topFrameElement)
      return loadContext.topFrameElement;
  }
  catch (err) {
  }

  try {
    if (loadContext.topWindow)
      return loadContext.topWindow;
  }
  catch (err) {
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
  }
  catch (exc) {
  }

  try {
    if (request && request.loadGroup && 
      request.loadGroup.notificationCallbacks) {
      return request.loadGroup.notificationCallbacks.
        getInterface(Ci.nsILoadContext);
    }
  }
  catch (exc) {
  }

  return null;
}

function getAncestorByTagName(node, tagName) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.localName && parent.tagName.toLowerCase() == tagName)
      return parent;
  }
  return null;
}

// Exports from this module
exports.MonitorActor = MonitorActor;
