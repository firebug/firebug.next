/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const { renderJson } = require("./json-viewer.js");
const { renderTiming } = require("./performance-timing.js");

/**
 * Listen for messages from the Console panel (chrome scope).
 */
addEventListener("firebug/chrome/message", event => {
  var data = event.data;

  switch (data.type) {
  case "renderJson":
    renderJson(data.args);
    break;
  case "renderTiming":
    renderTiming(data.args);
    break;
  }
}, true);

/**
 * Post message for the chrome scope listener.
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

// Final initialize message posted for the chrome indicating that
// all content modules has been successfully loaded.
postChromeMessage("ready");
});
