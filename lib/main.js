/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Firebug } = require("./firebug.js");
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { start } = require("./debug/startup.js");
const { prefs } = require("sdk/simple-prefs");

// Entry point of the extension. Both 'main' and 'onUnload' methods are
// exported from this module and executed automatically by Add-ons SDK.
function main(options, callbacks) {
  Trace.sysout("main; ", options);

  // Initialize the main application object (a singleton). There is one
  // Firebug instance shared across all browser windows.
  Firebug.initialize(options);

  // Hook developer tools events to maintain Firebug object life time.
  // xxxHonza: this might be done inside chrome module.
  gDevTools.on("toolbox-ready", Firebug.onToolboxReady.bind(Firebug));
  gDevTools.on("toolbox-destroyed", Firebug.onToolboxDestroyed.bind(Firebug));
  gDevTools.on("pref-changed", Firebug.updateOption.bind(Firebug));

  // Run custom start up sequence (e.g. opens the toolbox automatically)
  // Helpful for debugging.
  if (prefs["debugStartup"])
    start();
}

function onUnload(reason) {
  Firebug.shutdown(reason)
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
exports.Firebug = Firebug;
