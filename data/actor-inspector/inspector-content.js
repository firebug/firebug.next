/* See license.txt for terms of usage */

"use strict";

(function({content, addMessageListener, sendAsyncMessage}) {

/**
 * Frame script loaded within inspector.html
 */
const Cu = Components.utils;

// Tracing
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
 * Listener for message from the inspector panel (chrome scope).
 * It's further distributed as DOM event, so it can be handled by
 * the page content script.
 */
addMessageListener("firebug/event/message", message => {
  const { type, data, origin, bubbles, cancelable } = message.data;

  Trace.sysout("inspector-content.js; message: " + message.name +
    ": " + type, message);

  // xxxHonza: should we rather use Wrapper.cloneIntoContentScope
  // instead of JSON.stringify.
  const event = new content.MessageEvent(type, {
    bubbles: bubbles,
    cancelable: cancelable,
    data: JSON.stringify(data, 2, 2),
    origin: origin,
    target: content,
    source: content,
  });

  content.dispatchEvent(event);
});

/**
 * Callback for messages coming from the debuggee target (aka the back-end).
 */
function onMessage(event) {
  let parentNode = window.document.getElementById("response");

  Trace.sysout("inspector-content.js; onMessage from: " +
    event.data.from, event);
};

/**
 * Send a message back to the Inspector panel (chrome scope).
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
