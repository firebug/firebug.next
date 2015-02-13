/* See license.txt for terms of usage */

"use strict";

var main = require("../../main.js");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { HarCollector } = require("./network-events-handler.js");
const { TargetEventsHandler } = require("./target-events-handler.js");
const { Exporter } = require("./exporter.js");
const { Options } = require("../../core/options.js");
const { HarUploader } = require("./har-uploader.js");

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
    Trace.sysout("NetworkMonitor.startMonitoring;");

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

      Trace.sysout("NetworkMonitor.startMonitoring; tab attached");

      this.tabClient = aTabClient;

      let listeners = [ "NetworkActivity" ];
      aClient.attachConsole(aTabGrip.consoleActor, listeners,
        (aResponse, aWebConsoleClient) => {

        if (!aWebConsoleClient) {
          TraceError.sysout("Couldn't attach to console: " + aResponse.error,
            aResponse);
          return;
        }

        Trace.sysout("NetworkMonitor.startMonitoring; web console attached",
          aResponse);

        this.webConsoleClient = aWebConsoleClient;

        let netPrefs = { "NetworkMonitor.saveRequestAndResponseBodies": true };
        this.webConsoleClient.setPreferences(netPrefs, () => {
          Trace.sysout("NetworkMonitor.startMonitoring; prefs set", arguments);

          this.targetEventsHandler = new TargetEventsHandler(this,
            aWebConsoleClient, this.toolbox.target);
          this.targetEventsHandler.connect();

          Trace.sysout("NetworkMonitor.startMonitorTab; READY", arguments);
        });
      });
    });
  },

  // HAR Collector

  pageLoadStart: function(aResponse) {
    // A page is about to be loaded, start collecting HTTP
    // data from events sent from the backend.
    this.networkEventsHandler = new HarCollector(this);
    this.networkEventsHandler.start();
  },

  pageLoadStop: function(aResponse) {
    // A page is done loading, stop collecting data. Note that
    // some requests for additional data can be still awaiting,
    // so, export all after it's all done.
    if (!this.networkEventsHandler) {
      this.networkEventsHandler.stop().then(this.exportData);
      this.networkEventsHandler = null;
    }
  },

  exportData: function(collector) {
    let items = collector.getItems();
    let context = main.Firebug.getContext(this.toolbox);
    let jsonp = false; // xxxHonza: use a preference for this
  },
})

// Exports from this module
exports.NetworkMonitor = NetworkMonitor;
