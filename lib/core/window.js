/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);

// Module implementation
var Win = {};

/**
 * Returns a promise that is resolved as soon as the window is loaded
 * or immediately if the window is already loaded.
 *
 * @param {Window} The window object we need use when loaded.
 * @param {Function} A callback that is executed when the window is loaded.
 */
Win.loaded = win => new Promise(resolve => {
  if (win.document.readyState === "complete") {
    resolve(win.document);
  }
  else {
    let listener = event => {
      win.removeEventListener("load", listener, false);
      resolve(event.target);
    };

    win.addEventListener("load", listener, false);
  }
});

// Exports from this module
exports.Win = Win;
