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
const Caption = React.createClass({
  displayName: "Caption",
  render: function() {
    return (
      SPAN({"className": "caption"}, this.props.object)
    );
  },
});

// Exports from this module
exports.Caption = React.createFactory(Caption);
});
