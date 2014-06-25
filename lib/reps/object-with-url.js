/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { Url } = require("../core/url.js");

// Domplate
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var ObjectWithUrl = domplate(Rep,
/** @lends ObjectWithUrl */
{
  className: "object",

  tag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle "),
      SPAN({"class": "objectPropValue"},
        "$object|getLocation"
      )
    ),

  getTitle: function(grip) {
    return grip.class;
  },

  getLocation: function(grip) {
    let url = grip.preview.url;
    return url ? Url.getFileName(url) : "";
  },

  supportsObject: function(grip, type) {
    if (!Reps.isGrip(grip))
      return false;

    return (grip.preview.kind == "ObjectWithURL");
  },
});

// Registration
Reps.registerRep(ObjectWithUrl);

// Exports from this module
exports.ObjectWithUrl = ObjectWithUrl;
