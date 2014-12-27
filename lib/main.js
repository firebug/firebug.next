/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { prefs } = require("sdk/simple-prefs");
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const { openToolbox } = require("dev/utils");
const { all } = require("sdk/core/promise");

// Export global event-target before all Firebug modules are loaded.
// This way modules can wait for 'initialize' event and get also
// access to the 'Firebug' singleton object as soon as possible.
const { target } = require("./target.js");
exports.target = target;

// Load Firebug modules now
const { Firebug } = require("./firebug.js");
Firebug.target = target;

const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { start } = require("./debug/startup.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * Entry point of the extension. Both 'main' and 'onUnload' methods are
 * exported from this module and executed automatically by Add-ons SDK.
 */
function main(options, callbacks) {
  Trace.sysout("main;", options);

  // Initialize Firebug, the main application object (a singleton).
  // There is only one Firebug instance shared across all browser windows.
  Firebug.initialize(options);

  // Fire an event, so other modules might initialize as well.
  // Modules can return a promise if the initialization process
  // is asynchronous.
  let promises = target.emit("initialize", [Firebug]);

  // Fire another event when the initialization process
  // (it's asynchronous) is done
  all(promises).then(() => {
    Trace.sysout("main; initialization done");
    target.emit("initialized", [Firebug]);
  });

  // Run custom start up sequence (e.g. open the toolbox automatically)
  // Use for debugging purposes only.
  if (prefs["debugStartup"]) {
    start();
  }

  // Open Firebug by default after installation.
  let reason = options.loadReason;
  if (reason == "install" || reason == "enable") {
    let toolId = Services.prefs.getCharPref("devtools.toolbox.selectedTool");
    // Workaround for https://github.com/mozilla/addon-sdk/pull/1688
    openToolbox({prototype: {}, id: toolId});
  }
}

function onUnload(reason) {
  Trace.sysout("main.onUnload; " + reason);

  // Fire an event, so other modules might execute destroy sequences too.
  target.emit("shutdown", [reason, Firebug]);

  Firebug.shutdown(reason);
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
exports.Firebug = Firebug;
