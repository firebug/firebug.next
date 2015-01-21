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
    var id = this.props.id;
    var prefix = this.props.prefix;

    return (
      React.DOM.tr({className: "poolRow"},
        React.DOM.td({}, id),
        React.DOM.td({}, prefix)
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
      rows.push(PoolRow({id: actorId, prefix: actor.actorPrefix}));
    };

    return (
      React.DOM.table({className: "poolTable"},
        React.DOM.thead({className: "poolRow"},
          React.DOM.th({width: "50%"}, "Actor ID"),
          React.DOM.th({width: "50%"}, "Prefix")
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
