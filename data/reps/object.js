/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { ObjectLink } = require("reps/object-link");
const { ObjectBox } = require("reps/object-box");
const { Caption } = require("reps/caption");

const { SPAN } = Reps.DOM;

/**
 * @template TODO docs
 */
const Obj = React.createClass({
  render: function() {
    var object = this.props.object;
    var props = this.shortPropIterator(object);

    // xxxHonza: ObjectLink doeesn't wrap the Arrayr rep, why?
    return (
      ObjectBox({className: "object"},
        SPAN({className: "objectTitle"}, this.getTitle(object)),
        SPAN({className: "objectLeftBrace", role: "presentation"}, "{"),
        props,
        SPAN({className: "objectRightBrace"}, "}")
      )
    )
  },

  getTitle: function() {
    return "Object";
  },

  longPropIterator: function (object) {
    try {
      return this.propIterator(object, 100);
    }
    catch (err) {
      Trace.sysout("ERROR " + err, err);
    }
  },

  shortPropIterator: function (object) {
    try {
      return this.propIterator(object, /*prefs["ObjectShortIteratorMax"]*/ 3);
    }
    catch (err) {
      Trace.sysout("ERROR " + err, err);
    }
  },

  propIterator: function(object, max) {
    function isInterestingProp(t, value) {
      return (t == "boolean" || t == "number" || (t == "string" && value) ||
        (t == "object" && value && value.toString));
    }

    // Work around https://bugzilla.mozilla.org/show_bug.cgi?id=945377
    if (Object.prototype.toString.call(object) === "[object Generator]") {
      object = Object.getPrototypeOf(object);
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

    // xxxHonza: localization
    if (props.length > max) {
      props.push(Caption({
        object: "more...",
      }));
    }
    else if (props.length > 0) {
      props[props.length-1]._owner.props.delim = "";
    }

    return props;
  },

  getProps: function (props, object, max, filter) {
    max = max || 3;
    if (!object) {
      return [];
    }

    var len = 0;

    try {
      for (var name in object) {
        if (props.length > max) {
          return;
        }

        var value;
        try {
          value = object[name];
        }
        catch (exc) {
          continue;
        }

        var t = typeof(value);
        if (filter(t, value)) {
          //var rep = Reps.getRep(value);
          //let tag = rep.tinyTag || rep.shortTag || rep.tag;
          if ((t == "object" || t == "function") && value) {
            //value = rep.getTitle(value);
            /*if (rep.titleTag) {
              tag = rep.titleTag;
            } else {
              tag = Reps.Obj.titleTag;
            }*/
          }

          var prop = PropRep({
            mode: "short",
            name: name,
            object: value,
            equal: ": ",
            delim: ", "
          });
          props.push(prop);
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
});

/**
 * @rep
 */
var PropRep = React.createClass(
/** @lends PropRep */
{
  render: function(){
    var object = this.props.object;
    var REP = Reps.getRep(object);
    return (
      SPAN({},
        SPAN({"class": "nodeName"}, this.props.name),
        SPAN({"class": "objectEqual", role: "presentation"}, this.props.equal),
        REP({object: object}),
        SPAN({"class": "objectComma", role: "presentation"}, this.props.delim)
      )
    )
  }
});

// Registration

function supportsObject(object, type) {
  return true;
}

var ObjFactory = React.createFactory(Obj);

Reps.registerDefaultRep({
  rep: ObjFactory,
  supportsObject: supportsObject
});

exports.Obj = ObjFactory;
});
