/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { prefs } = require("sdk/simple-prefs");
const { Locale } = require("../core/locale.js");

// Domplate
const { domplate, SPAN, FOR, TAG } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var Storage = domplate(Rep,
/** @lend Storage */
{
  className: "Storage",

  tag:
    OBJECTLINK(
      SPAN({"class": "storageTitle"}, "$object|summarize "),
      FOR("prop", "$object|longPropIterator",
        "$prop.name",
        SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
        TAG("$prop.tag", {object: "$prop.object"}),
        SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
      )
    ),

  shortTag:
    OBJECTLINK(
      SPAN({"class": "storageTitle"}, "$object|summarize "),
      FOR("prop", "$object|shortPropIterator",
        "$prop.name",
        SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
        TAG("$prop.tag", {object: "$prop.object"}),
        SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
      )
    ),

  summarize: function(grip) {
    return Locale.$STRP("firebug.storage.totalItems",
       [grip.preview.ownPropertiesLength]);
  },

  supportsObject: function(grip, type) {
    return (grip.class == "Storage" && grip.preview);
  },

  longPropIterator: function(grip) {
    return this.propIterator(grip.preview.ownProperties, 100);
  },

  shortPropIterator: function(grip) {
    return this.propIterator(grip.preview.ownProperties,
      prefs["ObjectShortIteratorMax"]);
  },

  propIterator: function(storage, max) {
    // Extract names/values and pass them through to the standard propIterator.
    var obj = Object.create(null);
    for (var i = 0, len = storage.length; i < len; i++) {
      var name = storage.key(i);
      obj[name] = storage.getItem(name);
    }

    return Reps.Obj.propIterator(obj, max);
  }
});

// Registration
Reps.registerRep(Storage);

// Exports from this module
exports.Storage = Storage;
