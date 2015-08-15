/* See license.txt for terms of usage */

"use strict";

/**
 * This file is specified as the 'main' module in package.json
 * MDN: https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/package_json
 */
let FBTrace = require("firebug.sdk/lib/core/trace.js").FBTrace;
let { main, Loader, override } = require("toolkit/loader");

// Get default loader options and create one new 'FBTrace' global,
// so it's automatically available in every loaded module.
// Note that FBTrace global should be used for debugging purposes only.
let options = require("@loader/options");

let defaultGlobals = override(require("sdk/system/globals"), {
  FBTrace: FBTrace
});

options = override(options, {
  globals: defaultGlobals,

  // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1123268
  modules: override(options.modules || {}, {
   "sdk/addon/window": require("sdk/addon/window")
  })
});

// Create custom loader with modified options.
let loader = Loader(options);
let program = main(loader, "./lib/main.js");

// Exports from this module
exports.main = program.main;
exports.onUnload = program.onUnload;
exports.Firebug = program.Firebug;
