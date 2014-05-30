/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Firebug } = require("./firebug.js");
const { Trace } = require("./trace.js");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

// The main application object (a singleton)
var firebug = new Firebug();

// Entry points of the extension
function main(options, callbacks) {
  Trace.sysout("main; ", options);
  firebug.initialize(options);
}

function onUnload(reason) {
  firebug.shutdown(reason)
}

// Hook developer tools events to maintain Firebug instance life time.
gDevTools.on("toolbox-ready", firebug.onToolboxReady.bind(firebug));
gDevTools.on("toolbox-destroyed", firebug.onToolboxDestroyed.bind(firebug));

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
