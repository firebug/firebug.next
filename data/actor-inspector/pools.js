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
        React.DOM.td({}, actor.actorPrefix),
        React.DOM.td({}, actor.typeName),
        React.DOM.td({}, actor.parentID),
        React.DOM.td({}, actor.constructor)
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

    // Iterate array of actors.
    var actors = this.props.pool;
    for (var i in actors) {
      rows.push(PoolRow(actors[i]));
    };

    // Pools are mixed with Actor objects (created using CreateClass).
    var className = "poolTable";
    if (this.props.actorClass) {
      className += " actorClass";
    }

    return (
      React.DOM.table({className: className},
        React.DOM.thead({className: "poolRow"},
          React.DOM.th({width: "20%"}, "Actor ID"),
          React.DOM.th({width: "20%"}, "Prefix"),
          React.DOM.th({width: "20%"}, "TypeName"),
          React.DOM.th({width: "20%"}, "Parent"),
          React.DOM.th({width: "20%"}, "Constructor")
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

      var actorClass = false;

      // xxxHonza: there are actors stored as pools.
      // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1119790#c1
      if (!Array.isArray(pool)) {
        pool = [pool];
        actorClass = true;
      }

      pools.push(PoolTable({
        pool: pool,
        actorClass: actorClass
      }));
    };

    return (
      React.DOM.div({className: "poolContainer"},
        pools
      )
    );
  }
});

var poolList = React.createFactory(PoolList);

var Pools = {
  render: function(data, parentNode) {
    React.render(poolList(data), parentNode);
  }
}

// Exports from this module
exports.Pools = Pools;

});
