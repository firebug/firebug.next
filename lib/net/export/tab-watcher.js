/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

function TabWatcher(netMonitor) {
  this.netMonitor = netMonitor;
  this.webConsoleClient = netMonitor.webConsoleClient;
  this.target = netMonitor.toolbox.target;

  this.onTabNavigated = this.onTabNavigated.bind(this);
  this.onTabDetached = this.onTabDetached.bind(this);
}

/**
 * TODO: docs
 */
TabWatcher.prototype = {
/** @lends TabWatcher */

  // Connection

  connect: function() {
    Trace.sysout("TabWatcher.connect;");

    this.target.on("close", this.onTabDetached);
    this.target.on("navigate", this.onTabNavigated);
    this.target.on("will-navigate", this.onTabNavigated);
  },

  disconnect: function() {
    if (!this.target) {
      return;
    }

    Trace.sysout("TabWatcher.disconnect;");

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
    Trace.sysout("TabWatcher.onTabNavigated; " + aType, aPacket);

    switch (aType) {
      case "will-navigate": {
        this.netMonitor.pageLoadBegin(aPacket);
        break;
      }
      case "navigate": {
        this.netMonitor.pageLoadDone(aPacket);
        break;
      }
    }
  },

  /**
   * Called when the monitored tab is closed.
   */
  onTabDetached: function() {
    Trace.sysout("TabWatcher.onTabDetached;");

    // xxxHonza: TODO FIXME
    //NetMonitorController.shutdownNetMonitor();
  }
};

// Exports from this module
exports.TabWatcher = TabWatcher;
