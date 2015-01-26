/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");

const { Reps } = require("reps/reps");

// Shortcuts
const TR = React.DOM.tr;
const TD = React.DOM.td;
const SPAN = React.DOM.span;
const TABLE = React.DOM.table;

/**
 * @template TODO docs
 */
var TreeRowRep = React.createClass({
  render: function() {
    var member = this.props;
    var rowClassName = "memberRow " + member.type + "Row";
    if (member.hasChildren) {
      rowClassName += "hasChildren";
    }

    var rowStyle = {
      "padding-left": (member.level * 16) + "px",
    };

    var valueRep = Reps.getRep(member.value);

    return (
      TR({className: rowClassName, onClick: this.onClick.bind(this)},
        TD({className: "memberLabelCell", style: rowStyle},
          SPAN({className: "memberLabel " + member.type + "Label"},
            member.name)
        ),
        TD({className: "memberValueCell"},
          SPAN({},
            valueRep({object: member.value})
          )
        )
      )
    )
  },

  onClick: function(event) {
    Trace.sysout("onclick", this)
  },

});

var TreeRow = React.createFactory(TreeRowRep);

/**
 * @template TODO docs
 */
var TreeViewRep = React.createClass({
  getInitialState: function() {
    return { data: {} };
  },

  render: function() {
    var rows = [];

    var members = getMembers(this.props);
    for (var i in members) {
      rows.push(TreeRow(members[i]));
    };

    return (
      TABLE({className: "domTable", cellpadding: 0, cellspacing: 0},
        rows
      )
    );
  },
});

// Helpers

function getMembers(object, level) {
  level = level || 0;

  var members = [];
  getObjectProperties(object, function(prop, value) {
    var valueType = typeof(value);
    var hasChildren = (valueType === "object" && hasProperties(value));
    var type = getType(value);

    var member = createMember(type, prop, value, level, hasChildren);
    members.push(member);
  });
  return members;
}

function createMember(type, name, value, level, hasChildren) {
  var member = {
    name: name,
    type: type,
    rowClass: "memberRow-" + type,
    open: "",
    level: level,
    hasChildren: hasChildren,
    value: value,
  };

  return member;
}

function getObjectProperties(obj, callback) {
  for (var p in obj) {
    try {
      callback.call(this, p, obj[p]);
    }
    catch (e) {
      Trace.sysout("domTree.getObjectProperties; EXCEPTION " + e, e);
    }
  }
}

function hasProperties(obj) {
  if (typeof(obj) == "string") {
    return false;
  }

  try {
    for (var name in obj) {
      return true;
    }
  }
  catch (exc) {
  }

  return false;
}

function getType(object) {
  // xxxHonza: A type provider (or a decorator) should be used here.
  // (see also a comment in {@WatchTree.getType}
  return "dom";
}

// Exports from this module
exports.TreeView = React.createFactory(TreeViewRep);
});
