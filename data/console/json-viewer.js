/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");

// Firebug SDK
const { TreeView } = require("reps/tree-view");
const { Reps } = require("reps/repository");

function renderJson(options) {
  var json = options.json;
  var parentNode = options.parentNode;

  Trace.sysout("Console.renderJson;", options);

  var jsonView = TreeView({
    data: json,
    mode: "tiny"
  });

  React.render(jsonView, parentNode);
}

exports.renderJson = renderJson;
});
