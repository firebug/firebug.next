/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { ObjectWithUrl } = require("./object-with-url.js");
const { Reps } = require("./reps.js");

// Domplate
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = ObjectWithUrl.tags;

/**
 * @rep
 *
 * xxxHonza: does stylesheet has anything special or {@ObjectWithUrl}
 * is good enough?
 */
var StyleSheet = domplate(ObjectWithUrl,
/** @lends StyleSheet */
{
  className: "object",

  tag:
    OBJECTLINK("StyleSheet ",
      SPAN({"class": "objectPropValue"},
          "$object|getLocation"
      )
    ),

  supportsObject: function(grip, type) {
    return (grip.class == "Stylesheet" && grip.preview);
  },

  persistObject: function(grip, context) {
    // xxxHonza: fix me return Obj.bind(this.persistor, top, grip.preview.url);
  },

  persistor: function(context, href) {
    // xxxHonza: fix me return Css.getStyleSheetByHref(href, context);
  }
});

// Registration
Reps.registerRep(StyleSheet);

// Exports from this module
exports.StyleSheet = StyleSheet;
