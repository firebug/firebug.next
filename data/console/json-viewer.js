/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");

// Firebug SDK
const { TreeView } = require("reps/tree-view");
const { Reps } = require("reps/repository");

/**
 * Listen for messages from the Inspector panel (chrome scope).
 */
addEventListener("firebug/chrome/message", event => {
  var data = event.data;
  switch (data.type) {
  case "renderJson":
    renderJson(data.args);
    break;
  }
}, true);

function renderJson(options) {
  var json = options.json;
  var parentNode = options.parentNode;
  var doc = parentNode.ownerDocument;

  Trace.sysout("Console.renderJson;", options);

  var jsonView = TreeView({
    data: json,
    mode: "tiny"
  });

  React.render(jsonView, parentNode);
}

/**
 * Post message to the chrome through DOM event dispatcher.
 * (there is no message manager for the markupview.xhtml frame).
 */
function postChromeMessage(type, args) {
  var data = {
    type: type,
    args: args,
  };

  var event = new MessageEvent("firebug/content/message", {
    bubbles: true,
    cancelable: true,
    data: data,
  });

  dispatchEvent(event);
}

// Final initialize message posted to the chrome indicating that
// all content modules has been successfully loaded.
postChromeMessage("ready");
});
