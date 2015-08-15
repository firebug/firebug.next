/* See license.txt for terms of usage */

define(function(require, exports, module) {

"use strict";

// Dependencies
const React = require("react");

// Firebug SDK
const { Reps } = require("reps/repository");
const { TreeView } = require("reps/tree-view");

// Shortcuts
const { DIV } = Reps.DOM;

/**
 * @template This template represents content of the tooltip frame.
 */
var DomContent = React.createClass(
/** @lends DomContent */
{
  displayName: "DomContent",

  getInitialState: function() {
    return {};
  },

  render: function() {
    var grip = this.state.data || this.props.data;
    return (
      DIV({},
        TreeView({
          forceUpdate: this.state.forceUpdate,
          key: "content",
          data: grip,
          provider: this.props.provider,
          mode: this.props.mode
        })
      )
    );
  }
});

// Exports from this module
exports.DomContent = React.createFactory(DomContent);
});
