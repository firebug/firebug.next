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
const { domplate, SPAN, TAG} = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var Attribute = domplate(Rep,
/** @lends Attribute */
{
  className: "Attr",

  tag:
    OBJECTLINK(
      SPAN(
        SPAN({"class": "attrTitle"}, "$object|getTitle"),
        SPAN({"class": "attrEqual"}, "="),
        TAG("$object|getValueTag", {object: "$object.preview.value"})
      )
    ),

  getTitle: function(grip) {
    return grip.preview.nodeName;
  },

  getValueTag: function(grip) {
    return Reps.String.tag;
  },

  supportsObject: function(grip, type) {
    return (grip.class == "Attr" && grip.preview);
  },
});

// Registration
Reps.registerRep(Attribute);

// Exports from this module
exports.Attribute = Attribute;
