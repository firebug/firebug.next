/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

// xxxHonza: use FBTrace instead of dumpn
let dumpn = Trace.sysout;

/**
 * Functions handling target-related lifetime events.
 */
function TargetEventsHandler(webConsoleClient, target) {
  this.webConsoleClient = webConsoleClient;
  this.target = target;

  this._onTabNavigated = this._onTabNavigated.bind(this);
  this._onTabDetached = this._onTabDetached.bind(this);
}

TargetEventsHandler.prototype = {
  /**
   * Listen for events emitted by the current tab target.
   */
  connect: function() {
    dumpn("TargetEventsHandler is connecting...");

    this.target.on("close", this._onTabDetached);
    this.target.on("navigate", this._onTabNavigated);
    this.target.on("will-navigate", this._onTabNavigated);
  },

  /**
   * Remove events emitted by the current tab target.
   */
  disconnect: function() {
    if (!this.target) {
      return;
    }

    dumpn("TargetEventsHandler is disconnecting...");

    this.target.off("close", this._onTabDetached);
    this.target.off("navigate", this._onTabNavigated);
    this.target.off("will-navigate", this._onTabNavigated);
  },

  /**
   * Called for each location change in the monitored tab.
   *
   * @param string aType
   *        Packet type.
   * @param object aPacket
   *        Packet received from the server.
   */
  _onTabNavigated: function(aType, aPacket) {
    dumpn("TargetEventsHandler.onTabNavigated; " + aType, aPacket);

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
  _onTabDetached: function() {
    dumpn("TargetEventsHandler.onTabDetached;");

    //NetMonitorController.shutdownNetMonitor();
  }
};

// Exports from this module
exports.TargetEventsHandler = TargetEventsHandler;
