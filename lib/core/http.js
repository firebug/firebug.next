/* See license.txt for terms of usage */
/* global require: true, exports: true */
"use strict";

// ************************************************************************** //
// Constants

const { Ci } = require("chrome");

var Http = {};

/*
 * Note: Library partly taken from Firebug 2.0
 *     (not everything has been imported).
 */

Http.getTopFrameElementForRequest = function(request) {
  var loadContext = Http.getRequestLoadContext(request);
  if (loadContext)
    return loadContext.topFrameElement;

  return null;
};

Http.getRequestLoadContext = function(request) {
  try {
    if (request && request.notificationCallbacks) {
      return request.notificationCallbacks.
        getInterface(Ci.nsILoadContext);
    }
  }
  catch (exc) { }

  try {
    if (request && request.loadGroup && 
      request.loadGroup.notificationCallbacks) {
      return request.loadGroup.notificationCallbacks.
        getInterface(Ci.nsILoadContext);
    }
  }
  catch (exc) { }

  return null;
};


exports.Http = Http;
