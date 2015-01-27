/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");

// Templates

/**
 * TODO docs
 */
var FactoryRow = React.createClass({
  render: function() {
    var factory = this.props;
    return (
      React.DOM.tr({className: "poolRow"},
        React.DOM.td({}, factory.name),
        React.DOM.td({}, factory.prefix),
        React.DOM.td({}, factory.ctor)
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

    var factories = this.props;
    for (var i in factories) {
      rows.push(FactoryRow(factories[i]));
    };

    return (
      React.DOM.table({className: "poolTable"},
        React.DOM.thead({className: "poolRow"},
          React.DOM.th({width: "33%"}, "Name"),
          React.DOM.th({width: "33%"}, "Prefix"),
          React.DOM.th({width: "33%"}, "Constructor")
        ),
        React.DOM.tbody(null, rows)
      )
    );
  }
});

/**
 * TODO docs
 */
var FactoryList = React.createClass({
  render: function() {
    var mainGlobal = [];
    var main = this.props[0];
    var child = this.props[1];

    // xxxHonza: localization
    return (
      React.DOM.div({className: "poolContainer"},
        React.DOM.h4(null, "Main Process - Global Factories"),
        FactoryTable(main.factories.global),
        React.DOM.h4(null, "Main Process - Tab Factories"),
        FactoryTable(main.factories.tab),
        React.DOM.h4(null, "Child Process - Global Factories"),
        FactoryTable(child.factories.global),
        React.DOM.h4(null, "Child Process - Tab Factories"),
        FactoryTable(child.factories.tab)
      )
    );
  }
});

var factoryList = React.createFactory(FactoryList);

var Factories = {
  render: function(packet, parentNode) {
    React.render(factoryList(packet), parentNode);
  }
}

// Exports from this module
exports.Factories = Factories;

});
