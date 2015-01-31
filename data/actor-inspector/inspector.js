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

  var packet = JSON.parse(event.data);
  refreshActors(packet[0], "globalActorsPane");
  refreshActors(packet[1], "tabActorsPane");
}

function refreshActors(data, parentNodeId) {
  var actorsPane = document.getElementById(parentNodeId);
  var pools = [data.actorPool];
  pools.push.apply(pools, data.extraPools.slice());

  // xxxHonza: use setState to refresh.
  Pools.render(pools, actorsPane);
}

});
