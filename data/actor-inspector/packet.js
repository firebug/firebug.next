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
  displayName: "Packet",
  render: function() {
    var packet = this.props.packet;
    var type = packet.type ? "\"" + packet.type + "\"" : "";
    var mode = "tiny";
    var classNames = ["packetPanel", this.props.type];

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

    var imgClassNames = ["arrow"];
    if (!type) {
      imgClassNames.push("hide");
    }

    // xxxHonza: localization
    if (this.props.type == "send") {
      return (
        DIV({className: classNames.join(" "), onClick: this.onClick},
          DIV({className: "body"},
            SPAN({className: "type"}, type),
            IMG({className: imgClassNames.join(" "), src: "./arrow.svg"}),
            SPAN({className: "to"}, packet.to),
            SPAN({className: "info"}, timeText + ", " + size)
          )
        )
      );
    } else {
      return (
        DIV({className: classNames.join(" "), onClick: this.onClick},
          DIV({className: "body"},
            DIV({className: "from"},
              SPAN({}, packet.from),
              IMG({className: imgClassNames.join(" "), src: "./arrow.svg"}),
              SPAN({}, type),
              SPAN({className: "info"}, timeText + ", " + size)
            ),
            DIV({className: "errorMessage"},
              DIV({}, packet.error),
              DIV({}, packet.message)
            ),
            DIV({className: "preview"},
              TreeView({data: previewData, mode: mode})
            )
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
