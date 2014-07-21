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
var CSSRule = domplate(Rep,
/** @lends CSSRule */
{
  className: "object",

  tag:
    OBJECTLINK("$object|getType ",
      SPAN({"class": "objectPropValue"},
        "$object|getDescription"
      )
    ),

  getType: function(grip) {
    return grip.class;
  },

  getDescription: function(grip) {
    return (grip.preview.kind == "ObjectWithText") ? grip.preview.text : "";
  },

  supportsObject: function(grip, type) {
    return (type == "CSSStyleRule" && grip.preview);
  },

  getTooltip: function(rule) {
    // xxxHonza: TODO
    return "";
  }
});

// Registration
Reps.registerRep(CSSRule);

// Exports from this module
exports.CSSRule = CSSRule;
