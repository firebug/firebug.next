/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { prefs } = require("sdk/simple-prefs");
const { Locale } = require("../core/locale.js");

// Domplate
const { domplate, PRE, SPAN, FOR, TAG } = Domplate;
const { OBJECTLINK } = Rep.tags;

// Generic template for a grip
var Grip = domplate(Rep,
{
  className: "object",

  tag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle "),
      SPAN({"class": "objectLeftBrace", role: "presentation"}, "{"),
      FOR("prop", "$object|shortPropIterator",
        " $prop.name",
        SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
        TAG("$prop.tag", {object: "$prop.object"}),
        SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
      ),
      SPAN({"class": "objectRightBrace"}, "}")
    ),

  shortTag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle "),
      SPAN({"class": "objectLeftBrace", role: "presentation"}, "{"),
      FOR("prop", "$object|shortPropIterator",
        " $prop.name",
        SPAN({"class": "objectEqual", role: "presentation"}, "$prop.equal"),
        TAG("$prop.tag", {object: "$prop.object"}),
        SPAN({"class": "objectComma", role: "presentation"}, "$prop.delim")
      ),
      SPAN({"class": "objectRightBrace"}, "}")
    ),

  titleTag:
    SPAN({"class": "objectTitle"}, "$object|getTitleTag"),

  getTitleTag: function(object) {
    var title;
    if (typeof(object) == "string")
      title = object;
    else
      title = this.getTitle(object);

    if (title == "Object")
      title = "{...}";

    return title;
  },

  longPropIterator: function (object) {
    try {
      return this.propIterator(object, 100);
    }
    catch (err) {
      TraceError.sysout("ERROR " + err, err);
    }
  },

  shortPropIterator: function (object) {
    try {
      return this.propIterator(object, prefs["ObjectShortIteratorMax"]);
    }
    catch (err) {
      TraceError.sysout("ERROR " + err, err);
    }
  },

  propIterator: function (object, max) {
    function isInterestingProp(t, value) {
      // xxxHonza: value.toString should be removed, needs testing 
      return (t == "boolean" || t == "number" || (t == "string" && value) ||
        (t == "object" && value && value.toString));
    }

    // Object members with non-empty values are preferred since it gives the
    // user a better overview of the object.
    var props = [];
    this.getProps(props, object, max, isInterestingProp);

    if (props.length <= max) {
      // There are not enough props yet (or at least, not enough props to
      // be able to know whether we should print "more..." or not).
      // Let's display also empty members and functions.
      this.getProps(props, object, max, function(t, value) {
        return !isInterestingProp(t, value);
      });
    }

    if (props.length > max) {
      props[props.length-1] = {
        object: Locale.$STR("firebug.reps.more") + "...",
        tag: Reps.Caption.tag,
        name: "",
        equal: "",
        delim: ""
      };
    }
    else if (props.length > 0) {
      props[props.length-1].delim = '';
    }

    return props;
  },

  getProps: function (props, object, max, filter) {
    max = max || 3;
    if (!object)
        return [];

    let len = 0;

    try {
      // xxxHonza: we should include things from the prototype too
      let ownProperties = object.preview.ownProperties;
      for (var name in ownProperties) {
        if (props.length > max)
            return;

        let desc = ownProperties[name];
        let value = desc.value;

        var t = typeof(value);
        if (filter(t, value)) {
          var rep = Reps.getRep(value);
          var tag = rep.tinyTag || rep.shortTag || rep.tag;
          if ((t == "object" || t == "function") && value) {
            value = rep.getTitle(value);
            if (rep.titleTag)
              tag = rep.titleTag;
            else
              tag = Reps.Obj.titleTag;
          }

          props.push({tag: tag, name: name, object: value,
            equal: "=", delim: ", "});
        }
      }
    }
    catch (err) {
      TraceError.sysout("Grip.getProps; EXCEPTION " + err, err);
    }
  },

  supportsObject: function(object, type) {
    if (!Reps.isGrip(object))
      return false;

    return (object.preview && object.preview.ownProperties)
  }
});

// Registration
Reps.registerRep(Grip);

// Exports from this module
exports.Grip = Grip;
