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
var DateTime = domplate(Rep,
/** @lends DateTime */
{
  className: "Date",

  tag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle ")
    ),

  getTitle: function(grip) {
    return new Date(grip.preview.timestamp).toString();
  },

  supportsObject: function(grip, type) {
    return (grip.class == "Date" && grip.preview);
  },
});

// Registration
Reps.registerRep(DateTime);

// Exports from this module
exports.DateTime = DateTime;
