/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { NetworkEventsHandler } = require("./network-events-handler.js");
const { TargetEventsHandler } = require("./target-events-handler.js");

/**
 * TODO: docs
 */
const NetworkMonitor = Class(
/** @lends NetworkMonitor */
{
  extends: EventTarget,

  initialize: function(options) {
    this.toolbox = options.toolbox;

    let { client, form } = this.toolbox.target;
    this.startMonitoring(client, form);
  },

  shutdown: function() {
    if (this.networkEventsHandler) {
      this.networkEventsHandler.disconnect();
    }

    if (this.targetEventsHandler) {
      this.targetEventsHandler.disconnect();
    }
  },

  // Implementation

  startMonitoring: function(aClient, aTabGrip, aCallback) {
    if (!aClient) {
      TraceError.sysout("No client found!");
      return;
    }

    this.client = aClient;

    aClient.attachTab(aTabGrip.actor, (aResponse, aTabClient) => {
      if (!aTabClient) {
        TraceError.sysout("No tabclient found!");
        return;
      }

      this.tabClient = aTabClient;

      let listeners = [ "NetworkActivity" ];
      aClient.attachConsole(aTabGrip.consoleActor, listeners,
        (aResponse, aWebConsoleClient) => {

        if (!aWebConsoleClient) {
          TraceError.sysout("Couldn't attach to console: " + aResponse.error,
            aResponse);
          return;
        }

        this.webConsoleClient = aWebConsoleClient;

        let netPrefs = { "NetworkMonitor.saveRequestAndResponseBodies": true };
        this.webConsoleClient.setPreferences(netPrefs, () => {

          // Listen to network and target events.
          this.networkEventsHandler = new NetworkEventsHandler(
            aWebConsoleClient, aClient);
          this.networkEventsHandler.connect();

          this.targetEventsHandler = new TargetEventsHandler(
            aWebConsoleClient, this.toolbox.target);
          this.targetEventsHandler.connect();

          Trace.sysout("NetworkMonitor.startMonitorTab; attached", arguments);
        });
      });
    });
  },
})

// Exports from this module
exports.NetworkMonitor = NetworkMonitor;
