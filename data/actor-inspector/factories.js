/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const { Reps } = require("reps/reps");

var React = require("react");
const { TR, TD, SPAN, TABLE, TBODY, THEAD, TH, DIV, H4 } = Reps.DOM;

// Templates

/**
 * TODO docs
 */
var FactoryRow = React.createClass({
  render: function() {
    var factory = this.props;
    return (
      TR({className: "poolRow"},
        TD({}, factory.name),
        TD({}, factory.prefix),
        TD({}, factory.ctor)
      )
    );
  }
});

/**
 * TODO docs
 * xxxHonza: localization
 */
var FactoryTable = React.createClass({
  render: function() {
    var rows = [];

    var factories = this.props.factories;
    for (var i in factories) {
      if (this.props.searchFilter &&
          JSON.stringify(factories[i]).indexOf(this.props.searchFilter) < 0) {
        // filter out packets which don't match the filter
        continue;
      }

      rows.push(FactoryRow(factories[i]));
    };

    return (
      TABLE({className: "poolTable"},
        THEAD({className: "poolRow"},
          TH({width: "33%"}, "Name"),
          TH({width: "33%"}, "Prefix"),
          TH({width: "33%"}, "Constructor")
        ),
        TBODY(null, rows)
      )
    );
  }
});

/**
 * TODO docs
 */
var FactoryList = React.createClass({
  getInitialState: function() {
    return {
      main: {factories: {}},
      child: {factories: {}},
      searchFilter: null
    };
  },
  render: function() {
    var mainGlobal = [];
    var main = this.state.main;
    var child = this.state.child;
    var searchFilter = this.state.searchFilter;

    // xxxHonza: localization
    return (
      DIV({className: "poolContainer"},
        H4(null, "Main Process - Global Factories"),
        FactoryTable({ factories: main.factories.global, searchFilter: searchFilter }),
        H4(null, "Main Process - Tab Factories"),
        FactoryTable({ factories: main.factories.tab, searchFilter: searchFilter }),
        H4(null, "Child Process - Global Factories"),
        FactoryTable({ factories: child.factories.global, searchFilter: searchFilter }),
        H4(null, "Child Process - Tab Factories"),
        FactoryTable({ factories: child.factories.tab, searchFilter: searchFilter })
      )
    );
  }
});

var factoryList = React.createFactory(FactoryList);

var Factories = {
  render: function(parentNode) {
    return React.render(factoryList(), parentNode);
  }
}

// Exports from this module
exports.Factories = Factories;

});
