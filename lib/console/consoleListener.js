/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { RemoteLogging } = require("./remote/logging.js");

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

    // xxxFlorent: this is certainly not the good place for this.
    var win = options.panel.target.window;
    console.log("options = ", options);
    // TODO remove passing the chrome window
    RemoteLogging.register(win, options.panel._frameWindow);
  },

  destroy: function() {
    Trace.sysout("consoleListener.destroy", arguments);
    this.client.removeListener("consoleAPICall", this.onConsoleAPICall);
    RemoteLogging.unregister();
  },

  onConsoleAPICall: function (aType, aPacket) {
    Trace.sysout("consoleListener.onConsoleAPICall; " + aType, aPacket);
  },
});

// Exports from this module
exports.ConsoleListener = ConsoleListener;
