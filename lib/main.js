/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Firebug } = require("./firebug.js");
const { Trace } = require("./trace.js");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

// Entry points of the extension. Both 'main' and 'onUnload' methods are
// exported from this module and executed automatically by Add-ons SDK.
function main(options, callbacks) {
  Trace.sysout("main; ", options);

  // Instantiate the main application object (a singleton). There is one
  // Firebug instance shared across all browser windows.
  var firebug = new Firebug(options);

  // Hook developer tools events to maintain Firebug object life time.
  gDevTools.on("toolbox-ready", firebug.onToolboxReady.bind(firebug));
  gDevTools.on("toolbox-destroyed", firebug.onToolboxDestroyed.bind(firebug));
}

function onUnload(reason) {
  firebug.shutdown(reason)
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
