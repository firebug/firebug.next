/* See license.txt for terms of usage */

"use strict";

/**
 * This file is specified as the 'main' module in package.json
 * MDN: https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/package_json
 */
let FBTrace = require("./core/trace.js").FBTrace;
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
  });
});

// Create custom loader with modified options.
let loader = Loader(options);

// JPM and CFX are expecting slightly different path for the main
// module.
// CFX: "./main.js"
// JPM: "./lib/main.js"
// This is because CFX treats the 'lib' folder specially while JPM
// switched to node style, which no longer assumes it's special.
// The 'module.uri.replace' solves the difference.
let program = main(loader, module.uri.replace("/index.js", "/main.js"));

// Exports from this module
exports.main = program.main;
exports.onUnload = program.onUnload;
exports.Firebug = program.Firebug;
