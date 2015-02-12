/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { NetworkEventsHandler } = require("./network-events-handler.js");
const { TargetEventsHandler } = require("./target-events-handler.js");

const LISTENERS = [ "NetworkActivity" ];
const NET_PREFS = { "NetworkMonitor.saveRequestAndResponseBodies": true };

/**
 * TODO: docs
 */
const NetworkMonitor = Class(
/** @lends NetworkMonitor */
{
  extends: EventTarget,

  initialize: function(options) {
    this.toolbox = options.toolbox;

    let target = this.toolbox.target;
    let { client, form } = target;

    this.startMonitoringTab(client, form, () => {
      FBTrace.sysout("!!! NetworkMonitor.started", arguments);
    });
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

  startMonitoringTab: function(aClient, aTabGrip, aCallback) {
    if (!aClient) {
      Cu.reportError("No client found!");
      return;
    }

    this.client = aClient;

    aClient.attachTab(aTabGrip.actor, (aResponse, aTabClient) => {
      if (!aTabClient) {
        Cu.reportError("No tab client found!");
        return;
      }
      this.tabClient = aTabClient;

      aClient.attachConsole(aTabGrip.consoleActor, LISTENERS, (aResponse, aWebConsoleClient) => {

        if (!aWebConsoleClient) {
          Cu.reportError("Couldn't attach to console: " + aResponse.error);
          return;
        }

        this.webConsoleClient = aWebConsoleClient;
        this.webConsoleClient.setPreferences(NET_PREFS, () => {

          this.networkEventsHandler = new NetworkEventsHandler(
            aWebConsoleClient, aClient);
          this.networkEventsHandler.connect();

          this.targetEventsHandler = new TargetEventsHandler(
            aWebConsoleClient, this.toolbox.target);
          this.targetEventsHandler.connect();

          if (aCallback) {
            aCallback();
          }
        });
      });
    });
  },
})

// Exports from this module
exports.NetworkMonitor = NetworkMonitor;
