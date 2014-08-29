/* See license.txt for terms of usage */

"use strict";

let FBTrace = require("./core/trace.js").FBTrace;
let { main, Loader, override } = require("toolkit/loader");

let options = require("@loader/options");

let defaultGlobals = override(require("sdk/system/globals"), {
  FBTrace: FBTrace
});

options = override(options, {
  globals: defaultGlobals
});

let loader = Loader(options);
let program = main(loader, "./main");
