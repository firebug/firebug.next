/* See license.txt for terms of usage */

"use strict";

const document = content.document;
const window = content;

// Handle click DOM event and send a message back
// to the chrome script.
addEventListener("click", function (event) {
  let data = {
    message: "click on Hello World panel",
    details: "Message from content script",
    tag: event.target.tagName
  };

  let objects = {
     target: event.target 
  };

  // Send message back the HelloWorldPanel.
  sendAsyncMessage("onSendMessage", data, objects);
}, false);
