/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js");
const { get } = require("sdk/l10n");

// Module Implementation
// xxxHonza: The module implements only basic API, so the reset of
// the code base can start localizing strings. Still needs to be
// finished, see: https://github.com/firebug/firebug.next/issues/12
var Locale = {};

Locale.$STR = function(name, bundle) {
  return get(name);
};

Locale.$STRF = function(name, args, bundle) {
  return get(name);
};

Locale.$STRP = function(name, args, index, bundle) {
  return get(name);
};

// Exports from this module
exports.Locale = Locale;
