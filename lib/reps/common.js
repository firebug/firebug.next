/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { prefs } = require("sdk/simple-prefs");
const { Locale } = require("../core/locale.js");

// Domplate
const { domplate, PRE, SPAN, FOR, TAG } = Domplate;
const { OBJECTBOX, OBJECTBLOCK, OBJECTLINK } = Rep.tags;

var PREOBJECTBOX =
    PRE({"class": "objectBox inline objectBox-$className",
      role: "presentation"
    }
);

// Undefined
Reps.Undefined = domplate(Rep,
{
  tag: OBJECTBOX("undefined"),

  className: "undefined",

  supportsObject: function(object, type) {
    // xxxHonza: how to check the grip?
    if (object && object.type && object.type == "undefined")
      return true;

    return (type == "undefined");
  }
});

// Null
Reps.Null = domplate(Rep, {
  tag: OBJECTBOX("null"),

  className: "null",

  supportsObject: function(object, type) {
    // xxxHonza: how to check the grip?
    if (object && object.type && object.type == "null")
      return true;

    return (object == null);
  }
});

// Number
Reps.Number = domplate(Rep, {
  tag:
    OBJECTBOX({"_repObject": "$object"}, "$object|stringify"),

  tinyTag:
    OBJECTBOX("$object"),

  className: "number",

  stringify: function(object) {
    return (Object.is(object, -0) ? "-0" : String(object));
  },

  supportsObject: function(object, type) {
    return type == "boolean" || type == "number";
  }
});

// String
Reps.String = domplate(Rep, {
  tag:
    OBJECTBOX({"_repObject": "$object"}, "&quot;$object&quot;"),

  shortTag:
    OBJECTBOX({"_repObject": "$object"},
      "&quot;$object|cropMultipleLines&quot;"
    ),

  tinyTag:
    OBJECTBOX("&quot;$object|cropMultipleLines&quot;"),

  className: "string",

  supportsObject: function(object, type) {
    return type == "string";
  }
});

const reSpecialWhitespace = /  |[\t\n]/;

// Text
Reps.Text = domplate(Rep, {
  className: "text",

  tag:
    OBJECTBOX("$object"),

  specialWhitespaceTag:
    PREOBJECTBOX("$object"),

  shortTag:
    OBJECTBOX("$object|cropMultipleLines"),

  getWhitespaceCorrectedTag: function(str) {
    return reSpecialWhitespace.test(str) ? this.specialWhitespaceTag : this.tag;
  },
});

// Caption
Reps.Caption = domplate(Rep, {
  tag:
    SPAN({"class": "caption"}, "$object")
});

// Generic JS Object
Reps.Obj = domplate(Rep,
{
  className: "object",

  tag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle "),
      SPAN({"class": "objectLeftBrace", role: "presentation"}, "{"),
      FOR("prop", "$object|shortPropIterator",
        SPAN({"class": "nodeName"}, "$prop.name"),
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
        SPAN({"class": "nodeName"}, "$prop.name"),
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
      return (t == "boolean" || t == "number" || (t == "string" && value) ||
        (t == "object" && value && value.toString));
    }

    // Work around https://bugzilla.mozilla.org/show_bug.cgi?id=945377
    if (Object.prototype.toString.call(object) === "[object Generator]")
      object = Object.getPrototypeOf(object);

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

    var len = 0;

    try {
      for (var name in object) {
        if (props.length > max)
            return;

        var value;
        try {
          value = object[name];
        }
        catch (exc) {
          continue;
        }

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
            equal: ": ", delim: ", "});
        }
      }
    }
    catch (exc) {
      // Sometimes we get exceptions when trying to read from
      // certain objects, like
      // StorageList, but don't let that gum up the works
      // XXXjjb also History.previous fails because object
      // is a web-page object
      // which does not have permission to read the history
    }
  },

  supportsObject: function(object, type) {
    return true;
  }
});

/**
 * @rep
 */
Reps.Caption = domplate(Rep, {
/** @lends Caption */
  tag:
    SPAN({"class": "caption"}, "$object")
});

// Registration of built-in reps. Other reps can come from extensions.
Reps.registerRep(
    Reps.Undefined,
    Reps.Null,
    Reps.Number,
    Reps.String
);

// Exports from this module
exports.Undefined = Reps.Undefined;
exports.Null = Reps.Null;
exports.Number = Reps.Number;
exports.String = Reps.String;
