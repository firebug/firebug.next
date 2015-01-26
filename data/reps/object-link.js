/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

var React = require("react");

const A = React.DOM.a;

/**
 * @template TODO docs
 */
const ObjectLink = React.createClass({
  render: function() {
    var className = this.props.className;
    var objectClassName = className ? " objectLink-" + className : "";
    var linkClassName = "objectLink" + objectClassName + " a11yFocus";

    return (
      A({className: linkClassName, _repObject: this.props.object},
        this.props.children
      )
    )
  }
});

// Exports from this module
exports.ObjectLink = React.createFactory(ObjectLink);
});
