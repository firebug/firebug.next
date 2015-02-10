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
  render: function() {
    return (
      SPAN({"class": "caption"}, this.props.object)
    )
  },
});

// Exports from this module
exports.Caption = React.createFactory(Caption);
});
