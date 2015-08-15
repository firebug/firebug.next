/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");

// Firebug SDK
const { TreeView } = require("reps/tree-view");
const { Reps } = require("reps/repository");

// Firebug
const { DomProvider } = require("./dom-provider");
const { GripStore } = require("./grip-store");
const { Dispatcher } = require("./dispatcher");
const { DomContent } = require("./dom-content");

var theApp;

// xxxHonza: API in this file implements mostly the communication
// between content and chrome scope. It duplicates API already
// presented in markup-view-content.js
// It would be great to have common module that can be included
// in a content scope and installing the communication channel
// automatically.

var rootGrip;

/**
 * Render panel content (expandable tree)
 */
function initialize(grip) {
  rootGrip = JSON.parse(grip);

  Trace.sysout("DomMain.initialize;" + DomProvider, rootGrip);

  var store = new GripStore();
  var content = DomContent({
    provider: new DomProvider(store),
    data: rootGrip,
    mode: "tiny"
  });

  theApp = React.render(content, document.querySelector("#content"));
}

/**
 * Update content
 */
Dispatcher.on("update", event => {
  Trace.sysout("MarkupTooltip; Update " + event.from, {
    event: event,
    theApp: theApp
  });

  theApp.setState({
    forceUpdate: (event.grip.actor == rootGrip.actor),
    data: theApp.state.data
  });
});

/**
 * Listen for messages from the Inspector panel (chrome scope).
 */
addEventListener("firebug/chrome/message", event => {
  var data = event.data;
  switch (data.type) {
  case "initialize":
    initialize(data.args);
    break;
  }
}, true);

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

/**
 * Navigation within the toolbox
 */
function onNavigate(event) {
  var target = event.target;
  var repObject = event.detail.repObject;

  postChromeMessage("navigate", repObject);
}
addEventListener("fbsdk:navigate", onNavigate, true);

// Final initialize message posted to the chrome indicating that
// all content modules has been successfully loaded.
postChromeMessage("ready");
});
