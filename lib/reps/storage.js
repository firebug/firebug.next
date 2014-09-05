/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Reps } = require("./reps.js");
const { prefs } = require("sdk/simple-prefs");
const { Locale } = require("../core/locale.js");

// xxxHonza: including the Grip rep causes its registration
// before Storage rep and since the Storage grip uses an "object"
// type it passes supportsObject before Storage. FIX ME
const { Grip } = require("./grip.js");

// Domplate
const { domplate, SPAN, FOR, TAG } = Domplate;
const { OBJECTLINK } = Grip.tags;

/**
 * @rep
 */
var Storage = domplate(Grip,
/** @lends Storage */
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

  getTitle: function(grip) {
    return grip.class;
  },

  summarize: function(grip) {
    // Preview isn't available e.g. if this grip was returned as part of
    // parent object preview.
    if (!grip.preview)
      return this.getTitle(grip);

    return Locale.$STRP("firebug.storage.totalItems",
       [grip.preview.ownPropertiesLength]);
  },

  supportsObject: function(grip, type) {
    return (grip.class == "Storage");
  },

  longPropIterator: function(grip) {
    return this.propIterator(grip, 100);
  },

  shortPropIterator: function(grip) {
    return this.propIterator(grip, prefs["ObjectShortIteratorMax"]);
  },

  propIterator: function(storage, max) {
    return Grip.propIterator(storage, max);
  }
});

// Registration
Reps.registerRep(Storage);

// Exports from this module
exports.Storage = Storage;
