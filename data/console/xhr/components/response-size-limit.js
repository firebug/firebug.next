/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");

// Shortcuts
const DOM = React.DOM;

/**
 * This template represents the 'Response' panel and is responsible
 * for rendering HTTP response body.
 */
var ResponseSizeLimit = React.createClass({
  displayName: "ResponseSizeLimit",

  getInitialState: function() {
    return {
      data: {}
    };
  },

  // Event Handlers

  onClickLimit: function(event) {
    var actions = this.props.actions;
    var content = this.props.data;

    actions.resolveString(content, "text");
  },

  // Rendering

  render: function() {
    var message = this.props.message;
    var reLink = /^(.*)<a>(.*)<\/a>(.*$)/;
    var m = message.match(reLink);

    return (
        DOM.div({className: "netInfoResponseSizeLimit"},
          DOM.span({}, m[1]),
          DOM.a({className: "objectLink", onClick: this.onClickLimit},
            m[2]
          ),
          DOM.span({}, m[3])
        )
    );
  }
});

// Exports from this module
exports.ResponseSizeLimit = ResponseSizeLimit;
});
