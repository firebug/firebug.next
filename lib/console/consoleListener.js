/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

/**
 * TODO: description
 *
 * xxxHonza: testing console API listener (RDP client side)
 * Explore webconsole.js to learn
 */
const ConsoleListener = Class(
/** @lends ConsoleListener */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("consoleListener.initialize", options);

    this.client = options.toolbox.target.client;
    this.client.addListener("consoleAPICall", this.onConsoleAPICall);
  },

  destroy: function() {
    this.client.removeListener("consoleAPICall", this.onConsoleAPICall);
  },

  onConsoleAPICall: function (aType, aPacket) {
    Trace.sysout("consoleListener.onConsoleAPICall; " + aType, aPacket);
  },
});

// Exports from this module
exports.ConsoleListener = ConsoleListener;
