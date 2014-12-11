/* See license.txt for terms of usage */

"use strict";

/**
 * Note: This file is loaded on the back-end (can be a remote device) in
 * a parent process.
 */

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js");
const Events = require("sdk/system/events.js");
const { getTabForContentWindow, getBrowserForTab }  = require("sdk/tabs/utils");
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});

// TODO support FirePHP
const acceptableLoggerHeaders = ["x-chromelogger-data"];

/**
 * TODO: description
 */
var HttpMonitor =
/** @lends HttpMonitor */
{
  // Initialization

  initialize: function(messageManager, childId) {
    Trace.sysout("httpMonitor.initialize;");

    this.messageManager = messageManager;
    this.onExamineResponse = this.onExamineResponse.bind(this);

    Events.on("http-on-examine-response", this.onExamineResponse);
  },

  shutdown: function() {
    Trace.sysout("httpMonitor.shutdown;");

    Events.off("http-on-examine-response", this.onExamineResponse);
  },

  // HTTP Observer

  onExamineResponse: function(event) {
    let { subject } = event;
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    let tab = getTabFromHttpChannel(subject);

    Trace.sysout("loggerActor.onExamineResponse; " + httpChannel.name,
      httpChannel);

    if (!tab) {
      return;
    }

    // tab.linkedBrowser is the property supported by the desktop version.
    // tab.browser looks to be the same property for the Android version.
    // xxxFlorent: Shouldn't there be a property that can be used for both?
    let linkedBrowser = getBrowserForTab(tab);

    // xxxHonza: we don't have this.parent
    //if (linkedBrowser !== this.parent.browser) {
    //  return;
    //}

    let headers = [];

    httpChannel.visitResponseHeaders((header, value) => {
      header = header.toLowerCase();
      if (acceptableLoggerHeaders.indexOf(header) !== -1) {
        headers.push(header);
      }
    });

    this.messageManager.sendAsyncMessage("http-monitor:examine-headers",
      {headerss: headers});

    Trace.sysout("loggerActor.onExamineResponse; headers " +
      headers.length, headers);
  },
}

// Helpers

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
    Trace.sysout("loggerActor.getTabFromHttpChannel; " +
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

exports.initialize = function(event) {
  let mm = event.mm
  let childId = event.childID;

  Trace.sysout("httpMonitor.exports.initialize; " + childId, event);

  // xxxHonza: when to shutdown? TODO FIXME
  HttpMonitor.initialize(mm, childId);
}
