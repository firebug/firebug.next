/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

function TargetEventsHandler(webConsoleClient, target) {
  this.webConsoleClient = webConsoleClient;
  this.target = target;

  this._onTabNavigated = this._onTabNavigated.bind(this);
  this._onTabDetached = this._onTabDetached.bind(this);
}

/**
 * TODO: docs
 */
TargetEventsHandler.prototype = {
/** @lends TargetEventsHandler */

  // Connection

  connect: function() {
    Trace.sysout("TargetEventsHandler is connecting...");

    this.target.on("close", this.onTabDetached);
    this.target.on("navigate", this.onTabNavigated);
    this.target.on("will-navigate", this.onTabNavigated);
  },

  disconnect: function() {
    if (!this.target) {
      return;
    }

    Trace.sysout("TargetEventsHandler is disconnecting...");

    this.target.off("close", this.onTabDetached);
    this.target.off("navigate", this.onTabNavigated);
    this.target.off("will-navigate", this.onTabNavigated);
  },

  // Event Handlers

  /**
   * Called for each location change in the monitored tab.
   *
   * @param string aType
   *        Packet type.
   * @param object aPacket
   *        Packet received from the server.
   */
  onTabNavigated: function(aType, aPacket) {
    Trace.sysout("TargetEventsHandler.onTabNavigated; " + aType, aPacket);

    switch (aType) {
      case "will-navigate": {
        break;
      }
      case "navigate": {
        break;
      }
    }
  },

  /**
   * Called when the monitored tab is closed.
   */
  onTabDetached: function() {
    Trace.sysout("TargetEventsHandler.onTabDetached;");

    //NetMonitorController.shutdownNetMonitor();
  }
};

// Exports from this module
exports.TargetEventsHandler = TargetEventsHandler;
