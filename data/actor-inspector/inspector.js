/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var $ = require("jquery");
var React = require("react");

var { Pools } = require("pools");
var { renderTabbedBox } = require("tabs");
var { PacketList } = require("packet-list");

// Initialization
window.addEventListener("refresh", onRefresh);
window.addEventListener("send-packet", onSendPacket);
window.addEventListener("receive-packet", onReceivePacket);

var packets = [];

// Initial panel rendering
renderTabbedBox();

// Render packet list.
var packetList = React.renderComponent(PacketList(packets),
  $("#tabPacketsPane").get(0));

/**
 * Renders content of the Inspector panel.
 */
function onRefresh(event) {

  var packet = JSON.parse(event.data);
  refreshActors(packet[0], "globalActorsPane");
  refreshActors(packet[1], "tabActorsPane");
  refreshPackets("tabPacketsPane");
}

function refreshActors(data, parentNodeId) {
  var actorsPane = document.getElementById(parentNodeId);
  var pools = [data.actorPool];
  pools.push.apply(pools, data.extraPools.slice());

  // xxxHonza: use setState to refresh.
  Pools.render(pools, actorsPane);
}

/**
 * RDP Transport Listener
 */
function onSendPacket(event) {
  packets.push({
    type: "send",
    packet: JSON.parse(event.data)
  });

  refreshPackets();
}

function onReceivePacket(event) {
  packets.push({
    type: "receive",
    packet: JSON.parse(event.data)
  });

  refreshPackets();
}

// xxxHonza: refactor into an utility object.
var timeout;
function refreshPackets() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }

  // Refresh on timeout to avoid to many re-renderings.
  timeout = setTimeout(() => {
    packetList.setState({ data: packets });
    timeout = null;
  }, 200);
}

});
