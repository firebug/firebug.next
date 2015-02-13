/* See license.txt for terms of usage */

"use strict";

var main = require("../../main.js");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { HarCollector } = require("./har-collector.js");
const { TargetEventsHandler } = require("./target-events-handler.js");
const { Exporter } = require("./exporter.js");
const { Options } = require("../../core/options.js");
const { HarUploader } = require("./har-uploader.js");
const { ExportUtils } = require("./export-utils.js");

// Devtools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

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

    this.exportCollectedData =
      makeInfallible(this.exportCollectedData.bind(this));
  },

  shutdown: function() {
    if (this.harCollector) {
      this.harCollector.disconnect();
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
    Trace.sysout("NetworkMonitor.pageLoadStart;", aResponse);

    // A page is about to be loaded, start collecting HTTP
    // data from events sent from the backend.
    this.harCollector = new HarCollector(this);
    this.harCollector.start();
  },

  pageLoadStop: function(aResponse) {
    Trace.sysout("NetworkMonitor.pageLoadStop;", aResponse);

    // A page is done loading, stop the collector. Note that
    // some requests for additional data can still be awaiting,
    // so export all after s all has been received from the backend.
    // (that's why stop() returns a promise)
    if (this.harCollector) {
      this.harCollector.stop().then(this.exportCollectedData);
      this.harCollector = null;
    }
  },

  exportCollectedData: function(collector) {
    Trace.sysout("NetworkMonitor.exportCollectedData;", collector);

    let toFile = Options.get("netexport.autoExportToFile");
    let toServer = Options.get("netexport.autoExportToServer")

    if (!toFile && !toServer) {
      TraceError.sysout("NetworkMonitor.exportData; ERROR no export " +
        "target defined!");
      return;
    }

    // xxxHonza: we need a pref for this netexport.autoExportJsonp
    let jsonp = false;
    let items = collector.getItems();
    let context = main.Firebug.getContext(this.toolbox);
    let jsonString = Exporter.buildHAR(context, jsonp, items);

    // Store collected data into a HAR file (into the  default directory).
    if (toFile) {
      this.exportToFile(context, jsonString, jsonp);
    }

    // Send collected data to the server.
    if (toServer) {
      this.exportToServer(context, jsonString)
    }
  },

  exportToFile: function(context, jsonString, jsonp) {
    var file = ExportUtils.getDefaultFolder();
    var now = new Date();

    function f(n, c) {
      if (!c) c = 2;
      var s = new String(n);
      while (s.length < c) s = "0" + s;
      return s;
    }

    var loc = context.getTitle();

    // File name can't use ":" so, make sure it's replaced by "-" in case
    // port number is specified in the URL (issue 4025).
    var name = loc ? loc : "unknown";
    name = name.replace(/\:/gm, "-", "");

    var fileName = name + "+" + now.getFullYear() + "-" +
      f(now.getMonth()+1) + "-" + f(now.getDate()) + "+" +
      f(now.getHours()) + "-" + f(now.getMinutes()) + "-" +
      f(now.getSeconds());

    // Default file extension is zip if compressing is on
    let fileExt = jsonp ? ".harp" : ".har";
    if (Options.get("netexport.compress")) {
      fileExt += ".zip";
    }

    file.append(fileName + fileExt);
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0666", 8));

    Exporter.saveToFile(file, jsonString, context);

    Trace.sysout("NetworkMonitor.exportToFile; EXPORTED: " + file.path);
  },

  eportToServer: function() {
    // xxxHonza: TODO
  }
})

// Exports from this module
exports.NetworkMonitor = NetworkMonitor;
