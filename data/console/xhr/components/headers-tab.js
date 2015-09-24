/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");
const { createFactories } = require("reps/rep-utils");
const { NetInfoGroupList } = createFactories(require("./net-info-groups.js"));

const DOM = React.DOM;

/**
 * This template represents the 'Headers' panel and is responsible
 * for rendering request and response headers.
 */
var HeadersTab = React.createClass({
  displayName: "HeadersTab",

  getInitialState: function() {
    return {};
  },

  render: function() {
    var data = this.props.data;
    var actions = this.props.actions;

    // Request headers if they are not available yet.
    if (!data.request.headers || !data.request.headers.length) {
      actions.requestData("requestHeaders");
    }

    if (!data.response.headers || !data.response.headers.length) {
      actions.requestData("responseHeaders");
    }

    var groups = [{
      name: Locale.$STR("xhrSpy.responseHeaders"),
      params: data.response.headers
    }, {
      name: Locale.$STR("xhrSpy.requestHeaders"),
      params: data.request.headers
    }]

    return (
      DOM.div({className: "headersTabBox"},
        DOM.div({className: "panelContent"},
          NetInfoGroupList({groups: groups})
        )
      )
    );
  }
});

// Exports from this module
exports.HeadersTab = HeadersTab;
});
