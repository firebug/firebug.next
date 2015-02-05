/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");
var ReactBootstrap = require("react-bootstrap");
var { TreeView } = require("reps/tree-view");

// Shortcuts
var Panel = React.createFactory(ReactBootstrap.Panel);

/**
 * TODO docs
 */
var Packet = React.createClass({
  render: function() {
    var type = this.props.type;
    var packet = this.props.packet;
    var label = (type == "send") ?
      ("To: " + packet.to) : ("From: "+ packet.from);

    if (packet.type) {
      label += ", Type: " + packet.type;
    }

    return (
      Panel({className: type},
        TreeView({data: packet})
      )
    );
  }
});

var PacketFactory = React.createFactory(Packet);

/**
 * @template This template represents a list of packets displayed
 * inside the panel content.
 */
var PacketList = React.createClass({
  getInitialState: function() {
    return { data: [] };
  },

  render: function() {
    var output = [];

    var packets = this.state.data;
    for (var i in packets) {
      output.push(PacketFactory(packets[i]));
    };

    return (
      React.DOM.div({className: "packetListBox"},
        output
      )
    );
  }
});

// Exports from this module
exports.PacketList = React.createFactory(PacketList);
});
