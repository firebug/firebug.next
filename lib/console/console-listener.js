/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

/**
 * This object is responsible for handling RDP events related to
 * the Console panel. This covers events related to console API
 * and perhaps network related events in the future.
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
    Trace.sysout("consoleListener.destroy", arguments);

    this.client.removeListener("consoleAPICall", this.onConsoleAPICall);
  },

  onConsoleAPICall: function (aType, aPacket) {
    Trace.sysout("consoleListener.onConsoleAPICall; " + aType, aPacket);
  },
});

// Exports from this module
exports.ConsoleListener = ConsoleListener;
