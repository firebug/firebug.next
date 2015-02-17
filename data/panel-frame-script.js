/* See license.txt for terms of usage */

"use strict";

(function({content, addMessageListener, sendAsyncMessage, removeMessageListener}) {

/**
 * Frame script loaded within inspector.html
 */
const Cu = Components.utils;

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

  // An example showing how to send RPD packet.
  //let str = '{"to": "root", "type": "listTabs"}';
  //let packet = JSON.parse(str);
  //port.postMessage(packet);
}, false);

/**
 * Listener for message from the inspector panel (chrome scope).
 * It's further distributed as DOM event, so it can be handled by
 * the page content script.
 */
function messageListener(message) {
  const { type, data, origin, bubbles, cancelable } = message.data;

  //Trace.sysout("inspector-content.js; message: " + message.name +
  //  ": " + type, message);

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
};

addMessageListener("firebug/event/message", messageListener);

window.addEventListener("unload", event => {
  removeMessageListener("firebug/event/message", messageListener);
})


/**
 * Callback for messages coming from the debuggee target (aka the back-end).
 */
function onMessage(event) {
  let parentNode = window.document.getElementById("response");

  Trace.sysout("inspector-content.js; onMessage from: " +
    event.data.from, event);
};

/**
 * Send a message back to the parent panel (chrome scope).
 */
function postChromeMessage(type, object, objects) {
  let data = {
    type: type,
    object: object,
  };

  sendAsyncMessage("message", data, objects);
}

Cu.exportFunction(postChromeMessage, window, {
  defineAs: "postChromeMessage"
});

})(this);
