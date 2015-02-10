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
window.addEventListener("select", onSelect);

/**
 * Change the current selection (the currently displayed packet)
 */
function onSelect(event) {
  refresh(JSON.parse(event.data));
}

function refresh(packet) {
  // xxxHonza: use setState.
  document.body.textContent = "";
  React.render(TreeView({data: packet}), document.body);
}

});
