/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { SPAN } = Reps.DOM;

/**
 * @template TODO docs
 */
const ObjectBox = React.createClass({
  displayName: "ObjectBox",
  render: function() {
    var className = this.props.className;
    var boxClassName = className ? " objectBox-" + className : "";

    return (
      SPAN({className: "objectBox" + boxClassName, role: "presentation"},
        this.props.children
      )
    )
  }
});

// Exports from this module
exports.ObjectBox = React.createFactory(ObjectBox);
});
