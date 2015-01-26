/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
var React = require("react");

const { Reps } = require("reps/reps");

/**
 * @template TODO docs
 */
const ArrayRep = React.createClass({
  render: function() {
    return (
      "array"
    )
  },
});

// Registration

function supportsObject(object, type) {
  return false;
}

Reps.registerRep({
  rep: React.createFactory(ArrayRep),
  supportsObject: supportsObject
});

exports.ArrayRep = React.createFactory(ArrayRep);
});
