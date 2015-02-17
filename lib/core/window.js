/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { once } = require("sdk/dom/events.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab } = require("sdk/tabs/utils");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Module implementation
var Win = {};

/**
 * Returns a promise that is resolved as soon as the window is loaded
 * or immediately if the window is already loaded.
 *
 * @param {Window} The window object we need use when loaded.
 */
Win.loaded = makeInfallible(win => new Promise(resolve => {
  if (win.document.readyState === "complete") {
    resolve(win.document);
  }
  else {
    once(win, "load", event => resolve(event.target));
  }
}));

// xxxHonza: we might want to merge with Win.loaded
Win.domContentLoaded = makeInfallible(win => new Promise(resolve => {
  if (win.document.readyState === "complete") {
    resolve(win.document);
  }
  else {
    once(win, "DOMContentLoaded", event => resolve(event.target));
  }
}));

Win.openNewTab = function(url, options) {
  let browser = getMostRecentBrowserWindow();
  openTab(browser, url, options);
}

// Exports from this module
exports.Win = Win;
