/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { ObjectBox } = require("reps/object-box");
const { Caption } = require("reps/caption");

// Shortcuts
const { SPAN, A } = Reps.DOM;

/**
 * @rep
 */
var ItemRep = React.createFactory(React.createClass(
/** @lends ItemRep */
{
  displayName: "ItemRep",
  render: function(){
    var object = this.props.object;
    var delim = this.props.delim;
    var REP = Reps.getRep(object);
    return (
      SPAN({},
        REP({object: object}),
        delim
      )
    )
  }
}));

/**
 * @rep
 */
var ArrayRep = React.createClass(
/** @lends ArrayRep */
{
  displayName: "ArrayRep",
  render: function() {
    var mode = this.props.mode || "short";
    var object = this.props.object;
    var hasTwisty = this.hasSpecialProperties(object);

    var items;

    if (mode == "tiny") {
      items = object.length;
    } else {
      // xxxHonza: prefs["ObjectShortIteratorMax"]
      var max = (mode == "short") ? 3 : 300;
      items = this.arrayIterator(object, max);
    }

    return (
      ObjectBox({className: "array", onClick: this.onToggleProperties},
        A({className: "objectLink", onclick: this.onClickBracket},
          SPAN({className: "arrayLeftBracket", role: "presentation"}, "[")
        ),
        items,
        A({className: "objectLink", onclick: this.onClickBracket},
          SPAN({className: "arrayRightBracket", role: "presentation"}, "]")
        ),
        SPAN({className: "arrayProperties", role: "group"})
      )
    )
  },

  getTitle: function(object, context) {
    return "[" + object.length + "]";
  },

  arrayIterator: function(array, max) {
    var items = [];

    for (var i=0; i<array.length && i<=max; i++) {
      try {
        var delim = (i == array.length-1 ? "" : ", ");
        var value = array[i];

        // Cycle detected
        //if (value === array) {
        //  value = new Reps.ReferenceObj(value);
        //}

        items.push(ItemRep({
          key: i,
          object: value,
          delim: delim
        }));
      }
      catch (exc) {
        items.push(ItemRep({object: exc, delim: delim, key: i}));
      }
    }

    if (array.length > max + 1) {
      items.pop();
      items.push(Caption({
        key: "more",
        object: Locale.$STR("reps.more"),
      }));
    }

    return items;
  },

  /**
   * Returns true if the passed object is an array with additional (custom)
   * properties, otherwise returns false. Custom properties should be
   * displayed in extra expandable section.
   *
   * Example array with a custom property.
   * let arr = [0, 1];
   * arr.myProp = "Hello";
   *
   * @param {Array} array The array object.
   */
  hasSpecialProperties: function(array) {
    function isInteger(x) {
      var y = parseInt(x, 10);
      if (isNaN(y)) {
        return false;
      }
      return x === y.toString();
    }

    var n = 0;
    var props = Object.getOwnPropertyNames(array);
    for (var i=0; i<props.length; i++) {
      var p = props[i];

      // Valid indexes are skipped
      if (isInteger(p)) {
        continue;
      }

      // Ignore standard 'length' property, anything else is custom.
      if (p != "length") {
        return true;
      }
    }

    return false;
  },

  // Event Handlers

  onToggleProperties: function(event) {
    // xxxHonza: TODO
  },

  onClickBracket: function(event) {
  }
});

// Registration

function supportsObject(object, type) {
  return Array.isArray(object) ||
    Object.prototype.toString.call(object) === "[object Arguments]";
}

Reps.registerRep({
  rep: React.createFactory(ArrayRep),
  supportsObject: supportsObject
});

exports.ArrayRep = React.createFactory(ArrayRep);
});
