/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");
const { Arr } = require("./array.js");
const { Reps } = require("./reps.js");
const { Locale } = require("../core/locale.js");

// Domplate
const { domplate, SPAN } = Domplate;

/**
 * @rep
 */
var XPathResult = domplate(Arr,
/** @lends XPathResult */
{
  className: "array xPathResult",

  toggles: null, // xxxHonza: FIX ME new ToggleBranch.ToggleBranch(),

  tag:
    SPAN(Arr.tag),

  shortTag:
    SPAN(Arr.shortTag),

  getTitle: function(grip) {
    return grip.class;
  },

  hasSpecialProperties: function(array) {
    return [];
  },

  supportsObject: function(grip, type) {
    return (grip.preview && grip.class == "XPathResult");
  },

  arrayIterator: function(grip, max) {
    let counter = 0;
    let items = [];

    // xxxHonza: we need the actual result elements in the preview.
    var props = grip.preview.safeGetterValues;
    for (let prop of Object.keys(props)) {
      var value = props[prop].getterValue;
      Trace.sysout("prop " + prop, prop)
      var rep = Reps.getRep(value);
      var tag = rep.shortTag || rep.tag;
      var delim = ", ";

      items.push({
        object: value,
        tag: tag,
        delim: delim
      });

      if (counter++ > max)
        break;
    }

    if (items.length > 0)
      items[items.length-1].delim = "";

    if (counter > max) {
      items[max] = {
        object: (999999) + " " +
          Locale.$STR("firebug.reps.more") + "...",
        tag: Reps.Caption.tag,
        delim: ""
      };
    }

    return items;
  },
});

// Registration
Reps.registerRep(XPathResult);

// Exports from this module
exports.XPathResult = XPathResult;
