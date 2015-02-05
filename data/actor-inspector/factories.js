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

    var factories = this.props;
    for (var i in factories) {
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
  render: function() {
    var mainGlobal = [];
    var main = this.props[0];
    var child = this.props[1];

    // xxxHonza: localization
    return (
      DIV({className: "poolContainer"},
        H4(null, "Main Process - Global Factories"),
        FactoryTable(main.factories.global),
        H4(null, "Main Process - Tab Factories"),
        FactoryTable(main.factories.tab),
        H4(null, "Child Process - Global Factories"),
        FactoryTable(child.factories.global),
        H4(null, "Child Process - Tab Factories"),
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
