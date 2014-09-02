/* See license.txt for terms of usage */

"use strict";

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
  globals: defaultGlobals
});

// Create custom loader with modified options.
let loader = Loader(options);
let mainFunction = main(loader, "./main");

// Exports from this module
exports.main = mainFunction.main;
exports.onUnload = mainFunction.onUnload;
exports.Firebug = mainFunction.Firebug;
