/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");

// Shortcuts
const DOM = React.DOM;

/**
 * This template represents the 'Headers' panel
 * s responsible for rendering its content.
 */
var CookiesTab = React.createClass({
  displayName: "CookiesTab",

  getInitialState: function() {
    return {
      data: {}
    };
  },

  render: function() {
    var actions = this.props.actions;
    var data = this.props.data;

    return (
      DOM.div({className: "cookiesTabBox"},
        DOM.div({className: "panelContent"},
          "cookies"
        )
      )
    );
  }
});

// Exports from this module
exports.CookiesTab = CookiesTab;
});
