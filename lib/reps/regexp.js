/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");

// Domplate
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var RegExp = domplate(Rep,
/** @lends RegExp */
{
  className: "regexp",

  tag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle"),
      SPAN(" "),
      SPAN({"class": "regexpSource"}, "$object|getSource")
    ),

  supportsObject: function(grip, type) {
    return (grip.class == "RegExp");
  },

  getTitle: function(grip) {
    return grip.class;
  },

  getSource: function(grip) {
    return grip.displayString;
  }
});

// Registration
Reps.registerRep(RegExp);

// Exports from this module
exports.RegExp = RegExp;
