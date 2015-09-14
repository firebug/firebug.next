/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {

const React = require("react");

// Constants
const DOM = React.DOM;

/**
 * This template is responsible for rendering basic layout
 * of the 'Headers' panel. It displays HTTP headers groups such as
 * received or response headers.
 */
var NetInfoGroupList = React.createClass({
  displayName: "NetInfoGroupList",

  getInitialState: function() {
    return {
      groups: []
    };
  },

  render: function() {
    var groups = this.props.groups;

    // Filter out empty groups.
    groups = groups.filter(group => {
      return (group.params && group.params.length) || group.content
    });

    // Render
    groups = groups.map(group => {
      return NetInfoGroupFactory({
        name: group.name,
        params: group.params,
        content: group.content
      });
    });

    return (
      DOM.div({className: "netInfoGroupListTable"},
        groups
      )
    );
  }
});

/**
 * TODO: docs
 * this.props.params
 * this.props.content
 */
var NetInfoGroup = React.createClass({
  displayName: "NetInfoGroup",

  getInitialState: function() {
    return {
      name: "",
      params: [],
      content: null
    };
  },

  render: function() {
    var content = this.props.content;

    if (!content && this.props.params) {
      content = NetInfoParamsFactory({headers: this.props.params});
    }

    return (
      DOM.div({className: "netInfoGroup"},
        DOM.div({className: "netInfoGroupBox"},
          DOM.span({className: "netInfoGroupTitle twisty"},
            this.props.name
          )
        ),
        DOM.div({},
          content
        )
      )
    );
  }
});

/**
 * This template renders list of parameters within a group.
 * It's essentially a list of name + value pairs.
 */
var NetInfoParams = React.createClass({
  displayName: "NetInfoParams",

  getInitialState: function() {
    return {
      headers: []
    };
  },

  render: function() {
    var headers = this.props.headers || [];

    headers.sort(function(a, b) {
      return a.name > b.name ? 1 : -1;
    });

    var rows = [];
    headers.forEach(header => {
      rows.push(
        DOM.tr({key: header.name},
          DOM.td({className: "netInfoParamName"},
            DOM.span({title: header.name}, header.name)
          ),
          DOM.td({className: "netInfoParamValue"},
            DOM.code({}, header.value)
          )
        )
      )
    });

    return (
      DOM.table({cellPadding: 0, cellSpacing: 0},
        DOM.tbody({},
          rows
        )
      )
    )
  }
});

// Factories for internal usage
const NetInfoParamsFactory = React.createFactory(NetInfoParams);
const NetInfoGroupFactory = React.createFactory(NetInfoGroup);

// Exports from this module
exports.NetInfoGroupList = NetInfoGroupList;
exports.NetInfoGroup = NetInfoGroup;
exports.NetInfoParams = NetInfoParams;
});
