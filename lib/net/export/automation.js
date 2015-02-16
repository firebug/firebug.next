/* See license.txt for terms of usage */

"use strict";

const main = require("../../main.js");
const options = require("@loader/options");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { target } = require("../../target.js");
const { Exporter } = require("./exporter.js");
const { HarUploader } = require("./har-uploader.js");
const { ExportUtils } = require("./export-utils.js");
const { NetworkMonitor } = require("./network-monitor.js");
const { Rdp } = require("../../core/rdp.js");
const { ExportDriverFront } = require("./export-driver-front.js");

/**
 * TODO: docs
 */
var Automation =
/** @lends Automation */
{
  active: false,

  onToolboxInitialize: function(toolbox) {
    Trace.sysout("Automation.onToolboxInitialize;");

    // Activate auto-export automatically if the preference says so.
    // xxxHonza: always enable for now HACK FIXME
    let autoExport = Options.getPref("netexport.alwaysEnableAutoExport");
    if (true || autoExport) {
      if (!this.isActive()) {
        this.activate();
      }

      // xxxHonza: store network monitor instances into a map
      if (!toolbox.networkMonitor) {
        toolbox.networkMonitor = new NetworkMonitor({toolbox});
      }
    }

    // If the token is set make sure the 'NetExport' global is
    // exposed into the page content (to the current Toolbox tab).
    // xxxHonza: Always expose driver API for now.
    let secretToken = Options.getPref("netexport.secretToken");
    if (true || secretToken) {
      this.registerDriverActor(toolbox);
    }
  },

  onToolboxDestroy: function(toolbox) {
    Trace.sysout("Automation.onToolboxDestroy;");

    if (toolbox.networkMonitor) {
      toolbox.networkMonitor.shutdown();
    }
  },

  shutdown: function(Firebug) {
    Trace.sysout("remoteLogging.shutdown;");

    // Unregister back-end actors on shutdown/disable/uninstall
    this.unregisterDriverActor();
  },
  // Activation

  isActive: function() {
    return this.active;
  },

  activate: function() {
    Trace.sysout("Automation.activate;");

    this.active = true;
    this.updateUI();
  },

  deactivate: function() {
    Trace.sysout("netexport.Automation: Auto export deactivated.");

    this.active = false;
    this.updateUI();
  },

  // Content Export Driver

  registerDriverActor: function(toolbox) {
    Trace.sysout("Automation.registerDriverActor;");

    let config = {
      prefix: "harExportDriver", // TODO remove
      actorClass: "ExportDriverActor",
      frontClass: ExportDriverFront,
      type: { tab: true },
      moduleUrl: options.prefixURI + "lib/net/export/export-driver-actor.js"
    };

    let client = toolbox.target.client;
    Rdp.registerActor(client, config).then(({registrar, front}) => {
      if (registrar) {
        toolbox.exportDriverRegistrar = registrar;
        toolbox.exportDriverFront = front;
        front.toolbox = toolbox;
      }
    });
  },

  unregisterDriverActor: function() {
    // xxxHonza: reference to the toolbox?
    /*if (toolbox.exportDriverRegistrar) {
      toolbox.exportDriverRegistrar.unregister().then(() => {
        Trace.sysout("automation.unregisterDriverActor; " +
          "unregistered", arguments);
      });
      toolbox.exportDriverRegistrar = null;
    }*/
  },

  // UI Update

  updateUI: function() {
    // xxxHonza: auto export button in the UI
  },

  exportToFile: function(win, jsonString, context) {
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
    var name = loc ? loc.host : "unknown";
    name = name.replace(/\:/gm, "-", "");

    var fileName = name + "+" + now.getFullYear() + "-" +
      f(now.getMonth()+1) + "-" + f(now.getDate()) + "+" + f(now.getHours()) + "-" +
      f(now.getMinutes()) + "-" + f(now.getSeconds());

    // Default file extension is zip if compressing is on, otherwise just har.
    var fileExt = ".har";
    if (Firebug.getPref(prefDomain, "compress"))
        fileExt += ".zip";

    file.append(fileName + fileExt);
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0666", 8));

    // Just for tracing purposes (can be changed within the saveToFile).
    var filePath = file.path;

    // Export data from the current context.
    // xxxHonza: what about JSONP support for auto export?
    Exporter.saveToFile(file, jsonString, context, false);

    Trace.sysout("netexport.Automation; PAGE EXPORTED: " + filePath);
  }
};

target.register(Automation);

// Exports from this module
exports.Automation = Automation;
