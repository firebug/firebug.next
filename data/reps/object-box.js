/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

var React = require("react");

const SPAN = React.DOM.span;

/**
 * @template TODO docs
 */
const ObjectBox = React.createClass({
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
