/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");
const { createFactories } = require("reps/rep-utils");
const { Tabs, TabPanel } = createFactories(require("reps/tabs"));
const { HeadersTab } = createFactories(require("./headers-tab.js"));
const { ResponseTab } = createFactories(require("./response-tab.js"));
const { ParamsTab } = createFactories(require("./params-tab.js"));
const { CookiesTab } = createFactories(require("./cookies-tab.js"));
const { PostTab } = createFactories(require("./post-tab.js"));

/**
 * This template renders the basic XHR info body.
 */
var NetInfoBody = React.createClass({
  displayName: "NetInfoBody",

  getInitialState: function() {
    return {
      tabActive: 1,
      data: null,
   };
  },

  onTabChanged: function(index) {
    this.setState({tabActive: index});
  },

  getTabPanels: function() {
    var actions = this.props.actions;
    var data = this.state.data || this.props.data;
    var request = data.request;
    var response = data.response;

    // Flags for optional tabs
    var hasCoookies = request.cookies && request.cookies.length ||
      response.cookies && response.cookies.length;
    var hasParams = request.queryString && request.queryString.length;
    var hasPostData = request.bodySize > 0;

    var panels = [];

    // Headers tab
    panels.push(
      TabPanel({className: "headers", title: Locale.$STR("xhrSpy.headers")},
        HeadersTab({data: data, actions: actions})
      )
    );

    // URL parameters tab
    if (hasParams) {
      panels.push(
        TabPanel({className: "params", title: Locale.$STR("xhrSpy.params")},
          ParamsTab({data: data, actions: actions})
        )
      );
    }

    // Posted data tab
    if (hasPostData) {
      panels.push(
        TabPanel({className: "post", title: Locale.$STR("xhrSpy.post")},
          PostTab({data: data, actions: actions})
        )
      )
    }

    // Response tab
    panels.push(
      TabPanel({className: "response", title: Locale.$STR("xhrSpy.response")},
        ResponseTab({data: data, actions: actions})
      )
    );

    // Cookies tab
    if (hasCoookies) {
      panels.push(
        TabPanel({className: "cookies", title: Locale.$STR("xhrSpy.cookies")},
          CookiesTab({data: data, actions: actions})
        )
      );
    }

    return panels;
  },

  render: function() {
    var tabActive = this.state.tabActive;
    var tabPanels = this.getTabPanels();
    return (
      Tabs({tabActive: tabActive, onAfterChange: this.onTabChanged},
        tabPanels
      )
    )
  }
});

// Exports from this module
exports.NetInfoBody = NetInfoBody;
});
