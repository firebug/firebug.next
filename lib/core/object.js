/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);

var Obj = {};

var uidCounter = 1;
Obj.getUniqueId = function() {
  return uidCounter++;
};

// Exports from this module
exports.Obj = Obj;
