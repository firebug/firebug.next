/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js");
const { defer } = require("sdk/core/promise");

// Module implementation 
var Win = {};

/**
 * Returns a promise that is resolved as soon as the window is loaded
 * or immediately if the window is already loaded.
 *
 * @param {@Window} The window object we need use when loaded.
 * @param {@Function} A callback that is executed when the window is loaded.
 */
Win.loaded = function(win, callback) {
  let deferred = defer();
  if (win.document.readyState === "complete") {
    deferred.resolve(win);
  } else {
    win.addEventListener("load", () => {
      deferred.resolve(win);
    });
  }
  return deferred.promise;
};

// Exports from this module
exports.Win = Win;
