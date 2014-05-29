/* See license.txt for terms of usage */

"use strict";

// ********************************************************************************************* //

var tabs = require("sdk/tabs");

const { ActionButton } = require("sdk/ui/button/action");
const { Trace } = require("./trace.js");

// ********************************************************************************************* //
// Toolbar Button

var button = ActionButton({
  id: "helloWorld-link",
  label: "Visit Mozilla",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onClick: handleClick
});

function handleClick(state) {
  Trace.sysout("main.handleClick;");
  tabs.open("http://www.mozilla.org/");
}

// ********************************************************************************************* //
