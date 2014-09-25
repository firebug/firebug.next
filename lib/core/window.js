/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { once } = require("sdk/dom/events.js");

// Module implementation
var Win = {};

/**
 * Returns a promise that is resolved as soon as the window is loaded
 * or immediately if the window is already loaded.
 *
 * @param {Window} The window object we need use when loaded.
 */
Win.loaded = win => new Promise(resolve => {
  if (win.document.readyState === "complete") {
    resolve(win.document);
  }
  else {
    once(win, "load", event => resolve(event.target));
  }
});

// xxxHonza: we might want to merge with Win.loaded
Win.domContentLoaded = win => new Promise(resolve => {
  if (win.document.readyState === "complete") {
    resolve(win.document);
  }
  else {
    once(win, "DOMContentLoaded", event => resolve(event.target));
  }
});

// Exports from this module
exports.Win = Win;
