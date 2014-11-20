/* See license.txt for terms of usage */
/* global require: true, exports: true */

"use strict";

const { Ci } = require("chrome");

// Module implementation
var Http = {};

/**
 * TODO:
 */
Http.getTopFrameElementForRequest = function(request) {
  let loadContext = Http.getRequestLoadContext(request);
  if (!loadContext) {
    return;
  }

  try {
    if (loadContext.topFrameElement) {
      return loadContext.topFrameElement;
    }
  }
  catch (err) {
  }

  try {
    if (loadContext.topWindow) {
      return loadContext.topWindow;
    }
  }
  catch (err) {
  }

  return null;
};

/**
 * TODO:
 */
Http.getRequestLoadContext = function(request) {
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
};

exports.Http = Http;
