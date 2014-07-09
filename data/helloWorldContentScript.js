/* See license.txt for terms of usage */

"use strict";

const document = content.document;
const window = content;

var port;

// Register listener for 'message' sent from the chrome scope.
// The chrome uses message manager API to send RDP port to the debuggee.
window.addEventListener("message", event => {
  // Port to debuggee (toolbox.target). The port represents communication
  // channel to the remote debugger server.
  port = event.ports[0];

  // Register callback for incoming RDP packets.
  port.onmessage = onMessage.bind(this);

  //xxxHonza: Ask for list of tabs (testing)
  var str = '{"to": "root", "type": "listTabs"}';
  var packet = JSON.parse(str);
  port.postMessage(packet);
}, false);

/**
 * Callback for messages coming from the debuggee target.
 */
function onMessage(event) {
  var parentNode = window.document.getElementById("content");

  var item = document.createElement("pre");
  item.textContent = JSON.stringify(event.data, 2, 2);
  parentNode.appendChild(item);
};

/**
 * For testing purposes.
 */
function sendChromeMessage() {
  let data = {
    message: "click on Hello World panel",
    details: "Message from content script",
    tag: event.target.tagName
  };

  let objects = {
     target: event.target 
  };

  // Send message back the HelloWorldPanel.
  sendAsyncMessage("message", data, objects);
}
