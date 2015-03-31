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

var packets = [];

// Initial panel rendering
renderTabbedBox();

// Render packet list.
var packetList = React.render(PacketList(packets),
                              document.querySelector("#tabPacketsPane"));
var globalActorsPane = Pools.render(document.querySelector("#globalActorsPane"));
var tabActorsPane = Pools.render(document.querySelector("#tabActorsPane"));
var actorFactoriesPane = Factories.render(document.querySelector("#actorFactoriesPane"));

// Initialization
window.addEventListener("devtools:refresh", onRefresh);
window.addEventListener("devtools:clear", onClear);
window.addEventListener("devtools:send-packet", onSendPacket);
window.addEventListener("devtools:receive-packet", onReceivePacket);
window.addEventListener("devtools:search", onSearch);

/**
 * Renders content of the Inspector panel.
 */
function onRefresh(event) {
  var packet = JSON.parse(event.data);
  refreshActors(packet[0], globalActorsPane);
  refreshActors(packet[1], tabActorsPane);
  refreshFactories(packet[0], packet[1]);
  refreshPackets();
}

function onSearch(event) {
  var value = JSON.parse(event.data);

  packetList.setState({ searchFilter: value });
  globalActorsPane.setState({ searchFilter: value });
  tabActorsPane.setState({ searchFilter: value });
  actorFactoriesPane.setState({ searchFilter: value });
}

function onClear() {
  packets = [];
  refreshPackets();
}

function refreshActors(data, poolPane) {
  var pools = [data.actorPool];
  pools.push.apply(pools, data.extraPools.slice());

  poolPane.setState({pools: pools});
}

function refreshFactories(main, child) {
  actorFactoriesPane.setState({main: main, child: child});
}

/**
 * RDP Transport Listener
 */
function onSendPacket(event) {
  appendPacket({
    type: "send",
    packet: JSON.parse(event.data),
    size: event.data.length,
    time: new Date()
  });
}

function onReceivePacket(event) {
  appendPacket({
    type: "receive",
    packet: JSON.parse(event.data),
    size: event.data.length,
    time: new Date()
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
