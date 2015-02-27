/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { ObjectBox } = require("reps/object-box");

/**
 * @template TODO docs
 */
const Number = React.createClass({
  displayName: "Number",
  render: function() {
    var value = this.props.object;
    if (this.props.mode == "tiny") {
      return (
        ObjectBox({className: "number"},
          value
        )
      )
    }
    else {
      return (
        ObjectBox({className: "number"},
          this.stringify(value)
        )
      )
    }
  },

  stringify: function(object) {
    return (Object.is(object, -0) ? "-0" : String(object));
  },
});

// Registration

function supportsObject(object, type) {
  return type == "boolean" || type == "number";
}

Reps.registerRep({
  rep: React.createFactory(Number),
  supportsObject: supportsObject
});

exports.Number = React.createFactory(Number);
});
