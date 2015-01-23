/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var { Pools } = require("pools");
var { renderTabbedBox } = require("tabs");
var { PacketList } = require("packet-list");

// Initialization
window.addEventListener("refresh", onRefresh);
window.addEventListener("send-packet", onSendPacket);
window.addEventListener("receive-packet", onReceivePacket);

var packets = [];

/**
 * Renders content of the Inspector panel.
 */
function onRefresh(event) {
  renderTabbedBox();

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
}

function onReceivePacket(event) {
  packets.push({
    type: "receive",
    packet: JSON.parse(event.data)
  });
}

function refreshPackets(parentNodeId) {
  var parentNode = document.getElementById(parentNodeId);

  // xxxHonza: use setState to refresh.
  PacketList.render(packets, parentNode);
}
});
