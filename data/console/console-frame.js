/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const { renderTiming } = require("./performance-timing.js");
const { onXhrLog } = require("./xhr/main.js");

/**
 * Listen for messages from the Console panel (chrome scope).
 */
addEventListener("firebug/chrome/message", event => {
  var data = event.data;

  switch (data.type) {
  case "renderTiming":
    renderTiming(data.args);
    break;

  case "onXhrLog":
    onXhrLog(data.args);
    break;
  }
}, true);
});
