/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");
const { TreeView } = require("reps/tree-view");

// Reps
require("reps/undefined");
require("reps/string");
require("reps/number");
require("reps/array");
require("reps/object");

// Event Listeners Registration
window.addEventListener("devtools:select", onSelect);
window.addEventListener("devtools:search", onSearch);

var packetTreeView;
var searchFilter;

function onSearch(event) {
  if (!packetTreeView) {
    return;
  }

  window.searchFilter = JSON.parse(event.data);

  packetTreeView.setState({
    searchFilter: window.searchFilter
  });
}

/**
 * Change the current selection (the currently displayed packet)
 */
function onSelect(event) {
  refresh(JSON.parse(event.data));
}

function refresh(packet) {
  // xxxHonza: use setState.
  document.body.textContent = "";
  packetTreeView = React.render(TreeView({data:packet}), document.body);
  packetTreeView.setState({
    searchFilter: window.searchFilter
  });
}

});
