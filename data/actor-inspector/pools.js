/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const { Reps } = require("reps/reps");
const React = require("react");
const { TR, TD, SPAN, TABLE, TBODY, THEAD, TH, DIV, H4 } = Reps.DOM;

// Templates

/**
 * TODO docs
 */
var PoolRow = React.createClass({
  render: function() {
    var actor = this.props;
    return (
      TR({className: "poolRow"},
        TD({}, actor.actorID),
        TD({}, actor.actorPrefix),
        TD({}, actor.typeName),
        TD({}, actor.parentID),
        TD({}, actor.constructor)
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
      if (this.props.searchFilter &&
          JSON.stringify(actors[i]).indexOf(this.props.searchFilter) < 0) {
        // filter out packets which don't match the filter
        continue;
      }
      rows.push(PoolRow(actors[i]));
    };

    // Pools are mixed with Actor objects (created using CreateClass).
    var className = "poolTable";
    if (this.props.actorClass) {
      className += " actorClass";
    }

    var id = this.props.id ? "ID: " + this.props.id : "";

    return (
      DIV({},
        H4({}, "Pool" + id),
        TABLE({className: className},
          THEAD({className: "poolRow"},
            TH({width: "20%"}, "Actor ID"),
            TH({width: "20%"}, "Prefix"),
            TH({width: "20%"}, "TypeName"),
            TH({width: "20%"}, "Parent"),
            TH({width: "20%"}, "Constructor")
          ),
          TBODY(null, rows)
        )
      )
    );
  }
});

/**
 * TODO docs
 */
var PoolList = React.createClass({
  getInitialState: function() {
    return {
      pools: []
    };
  },
  render: function() {
    var pools = [];

    for (var i in this.state.pools) {
      var poolData = this.state.pools[i];
      var pool = poolData.pool;
      var poolId = poolData.id;

      var actorClass = false;

      // xxxHonza: there are actors stored as pools.
      // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1119790#c1
      if (!Array.isArray(pool)) {
        pool = [pool];
        actorClass = true;
      }

      pools.push(PoolTable({
        pool: pool,
        actorClass: actorClass,
        id: poolId,
        searchFilter: this.state.searchFilter
      }));
    };

    return (
      DIV({className: "poolContainer"},
        pools
      )
    );
  }
});

var poolList = React.createFactory(PoolList);

var Pools = {
  render: function(parentNode) {
    return React.render(poolList(), parentNode);
  }
}

// Exports from this module
exports.Pools = Pools;

});
