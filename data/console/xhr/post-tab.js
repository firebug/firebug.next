/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");
const { createFactories } = require("reps/rep-utils");
const { HeaderList } = createFactories(require("./headers.js"));

// Constants
const DOM = React.DOM;

/**
 * This template represents the 'Post' panel and is responsible
 * for displaying posted data.
 */
var PostTab = React.createClass({
  displayName: "PostTab",

  getInitialState: function() {
    return {
      data: {}
    };
  },

  render: function() {
    var actions = this.props.actions;
    var data = this.props.data;

    if (data.discardRequestBody) {
      return DOM.span({className: "netInfoBodiesDiscarded"},
        Locale.$STR("xhrSpy.requestBodyDiscarded")
      );
    }

    var postData = data.request.postData;
    if (!postData) {
      actions.requestData("requestPostData");

      // xxxHonza: localization, real spinner
      return (
        DOM.div("Loading...")
      );
    }

    return (
      DOM.div({className: "PostTabBox"},
        DOM.div({className: "panelContent netInfoResponseContent"},
          postData.text
        )
      )
    );
  }
});

// Exports from this module
exports.PostTab = PostTab;
});
