/* See license.txt for terms of usage */

"use strict";

(function({content, addMessageListener, sendAsyncMessage}) {

/**
 * Content script loaded within inspector.html
 */

const Cu = Components.utils;

const { traceConsoleService } = Cu.import("resource://fbtrace/firebug-trace-service.js", {});
const Trace = traceConsoleService.getTracer("extensions.firebug");

const document = content.document;
const window = content;

var port;

/**
 * Register listener for 'message' sent from the chrome scope.
 * The first message initializes a port that can be used to
 * send RDP packets directly to the back-end.
 */
window.addEventListener("message", event => {
  // Port to debuggee (toolbox.target). The port represents communication
  // channel to the remote debugger server.
  port = event.ports[0];

  Trace.sysout("inspector-content.js; initialization", event);

  // Register callback for incoming RDP packets.
  port.onmessage = onMessage.bind(this);
}, false);

/**
 * Listener for commands from the chrome scope. Commands can be fired
 * by UI that is part of the chrome (XUL).
 *
 * xxxHonza: should be further distributed as DOM event, so it can
 * be handled by the page content script.
 */
addMessageListener("firebug:command", event => {
  let parentNode = window.document.getElementById("response");

  Trace.sysout("inspector-content.js; command", event);

  if (event.data.id == "refresh") {
    let item = document.createElement("pre");
    item.textContent = JSON.stringify(event.data.data, 2, 2);
    parentNode.appendChild(item);
  }
});

/**
 * Callback for messages coming from the debuggee target (aka the back-end).
 */
function onMessage(event) {
  let parentNode = window.document.getElementById("response");

  Trace.sysout("inspector-content.js; onMessage from: " +
    event.data.from, event);

  //let item = document.createElement("pre");
  //item.textContent = JSON.stringify(event.data, 2, 2);
  //parentNode.appendChild(item);
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

})(this);
