/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var { Pools } = require("pools");
var { renderTabbedBox } = require("tabs");

// Initialization
window.addEventListener("refresh", onRefresh);

/**
 * Renders content of the Inspector panel.
 */
function onRefresh(event) {
  renderTabbedBox();

  var globalActorsPane = document.getElementById("globalActorsPane");
  var packet = JSON.parse(event.data);

  var pools = [packet.actorPool];
  pools.push.apply(pools, packet.extraPools.slice());

  Pools.render(pools, globalActorsPane);
}
});
