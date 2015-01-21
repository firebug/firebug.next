/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");

// Templates

/**
 * TODO docs
 */
var PoolRow = React.createClass({
  render: function() {
    var actor = this.props;
    return (
      React.DOM.tr({className: "poolRow"},
        React.DOM.td({}, actor.actorID),
        React.DOM.td({}, actor.prefix),
        React.DOM.td({}, actor.parentID),
        React.DOM.td({}, actor.ctor)
      )
    );
  }
});

/**
 * TODO docs
 * xxxHonza: localization
 */
var PoolTable = React.createClass({
  render: function() {
    var rows = [];

    var actors = Object.keys(this.props);
    for (var i in actors) {
      var actorId = actors[i];
      var actor = this.props[actorId];
      rows.push(PoolRow(actor));
    };

    return (
      React.DOM.table({className: "poolTable"},
        React.DOM.thead({className: "poolRow"},
          React.DOM.th({width: "25%"}, "Actor ID"),
          React.DOM.th({width: "25%"}, "Prefix"),
          React.DOM.th({width: "25%"}, "Parent"),
          React.DOM.th({width: "25%"}, "Ctor Name")
        ),
        React.DOM.tbody(null, rows)
      )
    );
  }
});

/**
 * TODO docs
 */
var PoolList = React.createClass({
  render: function() {
    var pools = [];

    for (var i in this.props) {
      var pool = this.props[i];
      pools.push(PoolTable(pool));
    };

    return (
      React.DOM.div({className: "poolContainer"},
        pools
      )
    );
  }
});

var poolTable = React.createFactory(PoolTable);
var poolList = React.createFactory(PoolList);

var Pool = {
  render: function(data, parentNode) {
    React.render(poolTable(data), parentNode);
  }
}

var Pools = {
  render: function(data, parentNode) {
    React.render(poolList(data), parentNode);
  }
}

// Exports from this module
exports.Pool = Pool;
exports.Pools = Pools;

});
