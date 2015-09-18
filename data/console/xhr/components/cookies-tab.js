/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");
const { createFactories } = require("reps/rep-utils");
const { NetInfoGroupList } = createFactories(require("./net-info-groups.js"));

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
    var file = this.props.data;

    var cookies = file.request.cookies;
    if (!cookies || !cookies.length) {
      actions.requestData("requestCookies");

      // xxxHonza: localization, real spinner
      return (
        DOM.div({}, "Loading...")
      );
    }

    // The cookie panel displays two groups of cookies:
    // 1) Response Cookies
    // 2) Request Cookies
    var groups = [{
      name: Locale.$STR("xhrSpy.responseCookies"),
      params: file.response.cookies
    }, {
      name: Locale.$STR("xhrSpy.requestCookies"),
      params: file.request.cookies
    }];

    return (
      DOM.div({className: "cookiesTabBox"},
        DOM.div({className: "panelContent"},
          NetInfoGroupList({
            groups: groups
          })
        )
      )
    );
  }
});

// Exports from this module
exports.CookiesTab = CookiesTab;
});
