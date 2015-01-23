/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");
var ReactBootstrap = require("react-bootstrap");

// Shortcuts
var Panel = React.createFactory(ReactBootstrap.Panel);

/**
 * TODO docs
 */
var PacketRep = React.createClass({
  render: function() {
    var type = this.props.type;
    var packet = this.props.packet;
    var label = (type == "send") ?
      ("To: " + packet.to) : ("From: "+ packet.from);

    if (packet.type) {
      label += ", Type: " + packet.type;
    }

    return (
      Panel({className: type}, label)
    );
  }
});

/**
 * TODO docs
 */
var PacketListRep = React.createClass({
  render: function() {
    var packets = [];

    for (var i in this.props) {
      var packet = this.props[i];

      packets.push(PacketRep(packet));
    };

    return (
      React.DOM.div({className: "packetListBox"},
        packets
      )
    );
  }
});

var packetListRep = React.createFactory(PacketListRep);

/**
 * Public API
 */
var PacketList = {
  render: function(packets, parentNode) {
    React.render(packetListRep(packets), parentNode);
  }
}

// Exports from this module
exports.PacketList = PacketList

});
