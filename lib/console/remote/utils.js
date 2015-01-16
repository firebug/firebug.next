/* See license.txt for terms of usage */

"use strict";

/**
 * This file is loaded on the back-end
 */

const Cu = Components.utils;
const Ci = Components.interfaces;

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

// Exports from this module
this.EXPORTED_SYMBOLS = ["getTopFrameElementForRequest"];
