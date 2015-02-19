/* See license.txt for terms of usage */

"use strict";

var main = require("../../main.js");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { HarCollector } = require("./har-collector.js");
const { TabWatcher } = require("./tab-watcher.js");
const { Exporter } = require("./exporter.js");
const { Options } = require("../../core/options.js");
const { Url } = require("../../core/url.js");
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
      this.harCollector.stop();
    }

    if (this.tabWatcher) {
      this.tabWatcher.disconnect();
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

          this.tabWatcher = new TabWatcher(this);
          this.tabWatcher.connect();

          Trace.sysout("NetworkMonitor.startMonitorTab; READY", arguments);
        });
      });
    });
  },

  // Tab Watcher Callbacks

  pageLoadBegin: function(aResponse) {
    Trace.sysout("NetworkMonitor.pageLoadBegin;", aResponse);

    if (this.harCollector) {
      this.harCollector.stop();
    }

    // A page is about to be loaded, start collecting HTTP
    // data from events sent from the backend.
    this.harCollector = new HarCollector(this);
    this.harCollector.start();
  },

  /**
   * A page is done loading, export collected data. Note that
   * some requests for additional page resources can still be pending,
   * so export all after all has been properly received from the backend.
   *
   * This collector still works and collects any consequent HTTP
   * traffic (e.g. XHRs) happening after the page is loaded and
   * The additional traffic can be exported through 'NetExport.triggerExport'
   * content API.
   */
  pageLoadDone: function(aResponse) {
    Trace.sysout("NetworkMonitor.pageLoadDone;", aResponse);

    if (this.harCollector) {
      // Wait for page load, export collected data and keep the
      // collector running.
      this.harCollector.waitForPageLoad().then(this.exportCollectedData);
    }
  },

  exportCollectedData: function(collector) {
    Trace.sysout("NetworkMonitor.exportCollectedData;", collector);

    let toFile = Options.get("netexport.autoExportToFile");
    let toServer = Options.get("netexport.autoExportToServer")

    // Bail out if there is no target for export. The export might
    // be done through the content API (NetExport.triggerExport).
    if (!toFile && !toServer) {
      return;
    }

    let jsonp = Options.get("netexport.autoExportHarp");
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

  exportToFile: makeInfallible(function(context, jsonString, jsonp) {
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
    //var name = loc ? loc : "unknown";
    //name = name.replace(/\:/gm, "-", "");
    //name = name.replace(/\//gm, "_", "");
    // xxxHonza: support for custom file names.
    var name = Url.getDomain(context.url);

    var fileName = name + "+" + now.getFullYear() + "-" +
      f(now.getMonth()+1) + "-" + f(now.getDate()) + "+" +
      f(now.getHours()) + "-" + f(now.getMinutes()) + "-" +
      f(now.getSeconds());

    // Default file extension is zip if compressing is on
    let fileExt = jsonp ? ".harp" : ".har";
    if (Options.get("netexport.compress")) {
      fileExt += ".zip";
    }

    Trace.sysout("NetworkMonitor.exportToFile; fileName: " +
      fileName + fileExt, context);

    file.append(fileName + fileExt);
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0666", 8));

    Exporter.saveToFile(file, jsonString, context);

    Trace.sysout("NetworkMonitor.exportToFile; EXPORTED: " + file.path);
  }),

  eportToServer: function() {
    // xxxHonza: TODO
  },

  // Content API Handlers

  /**
   * Export the current data collection now and do not wait for pending
   * requests. This is used by the content 'NetExport' driver.
   * (see NetExport.triggerExport)
   */
  triggerExport: function() {
    if (this.harCollector) {
      this.exportCollectedData(this.harCollector);
    }
  },

  clear: function() {
    if (this.harCollector) {
      this.harCollector.clear();
    }
  },
})

// Exports from this module
exports.NetworkMonitor = NetworkMonitor;
