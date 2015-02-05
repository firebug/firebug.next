/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var $ = require("jquery");
var React = require("react");

var { Pools } = require("pools");
var { renderTabbedBox } = require("tabs");
var { PacketList } = require("packet-list");
var { Factories } = require("factories");
var { Reps } = require("reps/reps");

// Reps
require("reps/undefined");
require("reps/string");
require("reps/number");
require("reps/array");
require("reps/object");

// Initialization
window.addEventListener("refresh", onRefresh);
window.addEventListener("clear", onClear);
window.addEventListener("send-packet", onSendPacket);
window.addEventListener("receive-packet", onReceivePacket);

var packets = [];

// Initial panel rendering
renderTabbedBox();

// Render packet list.
var packetList = React.render(PacketList(packets),
  $("#tabPacketsPane").get(0));

/**
 * Renders content of the Inspector panel.
 */
function onRefresh(event) {
  var packet = JSON.parse(event.data);
  refreshActors(packet[0], "globalActorsPane");
  refreshActors(packet[1], "tabActorsPane");
  refreshPackets("tabPacketsPane");
  refreshFactories(packet, "actorFactoriesPane");
}

function onClear() {
  packets = [];
  refreshPackets();
}

function refreshActors(data, parentNodeId) {
  var actorsPane = document.getElementById(parentNodeId);
  var pools = [data.actorPool];
  pools.push.apply(pools, data.extraPools.slice());

  // xxxHonza: use setState to refresh.
  Pools.render(pools, actorsPane);
}

function refreshFactories(packet, parentNodeId) {
  var pane = document.getElementById(parentNodeId);

  // xxxHonza: use setState to refresh.
  Factories.render(packet, pane);
}

/**
 * RDP Transport Listener
 */
function onSendPacket(event) {
  appendPacket({
    type: "send",
    packet: JSON.parse(event.data)
  });
}

function onReceivePacket(event) {
  appendPacket({
    type: "receive",
    packet: JSON.parse(event.data)
  });
}

function appendPacket(packet) {
  packets.push(packet);

  // xxxHonza: limit for now.
  if (packets.length > 100) {
    packets.shift();
  }

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
