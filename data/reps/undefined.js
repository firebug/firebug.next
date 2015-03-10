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
const Undefined = React.createClass({
  displayName: "UndefinedRep",
  render: function() {
    return (
      ObjectBox({className: "undefined"},
        "undefined"
      )
    )
  },
});

// Registration

function supportsObject(object, type) {
  // xxxHonza: how to check the grip?
  if (object && object.type && object.type == "undefined") {
    return true;
  }

  return (type == "undefined");
}

Reps.registerRep({
  rep: React.createFactory(Undefined),
  supportsObject: supportsObject
});

exports.Undefined = React.createFactory(Undefined);
});
