/* See license.txt for terms of usage */
/* global require: true, exports: true */

"use strict";

const { Cc, Ci } = require("chrome");

// Module implementation
var Http = {};

/**
 * Returns top parent window (or frame) for given HTTP request.
 *
 * @param {nsIHttpChannel} request HTTP channel we need the top window for.
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
  } catch (err) {
  }

  try {
    if (loadContext.topWindow) {
      return loadContext.topWindow;
    }
  } catch (err) {
  }

  return null;
};

/**
 * Returns load context for given HTTP request
 *
 * @param {nsIHttpChannel} request HTTP channel we need the load context for.
 */
Http.getRequestLoadContext = function(request) {
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
};

/**
 * TODO: docs
 */
Http.getInputStreamFromString = function(dataString) {
  var stringStream = Cc["@mozilla.org/io/string-input-stream;1"].
    createInstance(Ci.nsIStringInputStream);

  if ("data" in stringStream) {
    // Gecko 1.9 or newer
    stringStream.data = dataString;
  } else {
    // 1.8 or older
    stringStream.setData(dataString, dataString.length);
  }

  return stringStream;
};

exports.Http = Http;
