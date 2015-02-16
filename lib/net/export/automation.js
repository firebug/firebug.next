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
};

target.register(Automation);

// Exports from this module
exports.Automation = Automation;
