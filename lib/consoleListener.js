/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");

/**
 * xxxHonza: testing console API listener (RDP client side)
 * Explore webconsole.js to learn
 */
var ConsoleListener =
{
  initialize: function(toolbox) {
    this.client = toolbox.target.client;
    this.client.addListener("consoleAPICall", this.onConsoleAPICall);

    Trace.sysout("consoleListener.initialize;");
  },

  destroy: function() {
    this.client.removeListener("consoleAPICall", this.onConsoleAPICall);
  },

  onConsoleAPICall: function (aType, aPacket) {
    Trace.sysout("consoleListener.onConsoleAPICall; " + aType, aPacket);
  },
}

// Exports from this module
exports.ConsoleListener = ConsoleListener;
