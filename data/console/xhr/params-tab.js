/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");
const { createFactories } = require("reps/rep-utils");
const { HeaderList } = createFactories(require("./headers.js"));

// Constants
const DOM = React.DOM;

/**
 * This template represents the 'Params' panel and is responsible
 * for displaying URL parameters.
 */
var ParamsTab = React.createClass({
  displayName: "ParamsTab",

  getInitialState: function() {
    return {
      data: {}
    };
  },

  render: function() {
    var actions = this.props.actions;
    var data = this.props.data;

    return (
      DOM.div({className: "paramsTabBox"},
        DOM.div({className: "panelContent"},
          HeaderList({headers: data.request.queryString})
        )
      )
    );
  }
});

// Exports from this module
exports.ParamsTab = ParamsTab;
});
