/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const ReactBootstrap = require("react-bootstrap");
const { Reps } = require("reps/reps");
const { TreeView } = require("reps/tree-view");
const { Obj } = require("reps/object");

// Shortcuts
const Panel = React.createFactory(ReactBootstrap.Panel);
const { DIV, SPAN, BR, IMG } = Reps.DOM;

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

    var mode = "tiny";
    var classNames = ["packetPanel", type];

    // xxxHonza TODO: HACK, FIXME
    var size = Str.formatSize(this.props.size);
    var time = this.props.time;

    // Use String.formatTime, but how to access from the content?
    var timeText = time.toLocaleTimeString() + "." + time.getMilliseconds();
    var previewData = {
      packet: packet
    }

    if (packet.error) {
      classNames.push("error");
    }

    // xxxHonza: localization
    if (type == "send") {
      return (
        DIV({className: classNames.join(" "), onClick: this.onClick},
          DIV({className: "body"},
            SPAN({className: "type"},"\"" + packet.type + "\""),
            IMG({className: "arrow", src: "./arrow.svg"}),
            SPAN({className: "to"}, packet.to),
            DIV({className: "info"}, timeText + ", " + size)
          )
        )
      );
    } else {
      return (
        DIV({className: classNames.join(" "), onClick: this.onClick},
          DIV({className: "body"},
            DIV({className: "from"},
              IMG({className: "arrow", src: "./arrow.svg"}),
              SPAN({}, packet.from)
            ),
            DIV({className: "errorMessage"},
              DIV({}, packet.error),
              DIV({}, packet.message)
            ),
            DIV({className: "preview"},
              TreeView({data: previewData, mode: mode})
            ),
            DIV({className: "info"}, timeText + ", " + size)
          )
        )
      );
    }
  },

  // Event Handlers

  onClick: function(event) {
    postChromeMessage("selection", this.props.packet);
  }
});

// Exports from this module
exports.Packet = React.createFactory(Packet);
});
