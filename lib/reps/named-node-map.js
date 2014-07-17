/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { Locale } = require("../core/locale.js");

// Domplate
const { domplate, SPAN, TAG, FOR } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var NamedNodeMap = domplate(Rep,
/** @lends NamedNodeMap */
{
  className: "NamedNodeMap",

  tag:
      OBJECTLINK(
          SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
          FOR("prop", "$object|longPropIterator",
              SPAN({"class": "nodeName"}, "$prop.name"),
              SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
              TAG("$prop.tag", {object: "$prop.object"}),
              SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
          ),
          SPAN({"class": "arrayRightBracket", role: "presentation"}, "]")
      ),

  shortTag:
      OBJECTLINK(
          SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
          FOR("prop", "$object|shortPropIterator",
              SPAN({"class": "nodeName"}, "$prop.name"),
              SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
              TAG("$prop.tag", {object: "$prop.object"}),
              SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
          ),
          SPAN({"class": "arrayRightBracket", role: "presentation"}, "]")
      ),

  supportsObject: function(grip, type) {
    return (grip.kind == "MapLike" && grip.preview);
  },

  longPropIterator: function(object) {
    return this.propIterator(object, 100);
  },

  shortPropIterator: function(object) {
    return this.propIterator(object, Options.get("ObjectShortIteratorMax"));
  },

  propIterator: function (object, max) {
    max = max || 3;

    var props = [];
    for (var i=0; i<object.length && i<max; i++) {
      var item = object.item(i);
      var name = item.name;
      var value = item.value;

      var rep = Firebug.getRep(value);
      var tag = rep.tag;

      props.push({tag: tag, name: name, object: value, equal: ": ", delim: ", "});
    }

    if (object.length > max) {
      var index = max - 1, more = object.length - max + 1;
      if (index < 1) {
        index = 1;
        more++;
      }

      props[index] = {
        object: more + " " + Locale.$STR("firebug.reps.more") + "...",
        tag: FirebugReps.Caption.tag,
        name: "",
        equal: "",
        delim: ""
      };
    }
    else if (props.length > 0) {
      props[props.length-1].delim = "";
    }

    return props;
  },
});

// Registration
Reps.registerRep(NamedNodeMap);

// Exports from this module
exports.NamedNodeMap = NamedNodeMap;
