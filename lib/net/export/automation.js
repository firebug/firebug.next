/* See license.txt for terms of usage */

"use strict";

const main = require("../../main.js");
const options = require("@loader/options");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { Locale } = require("../../core/locale.js");
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
    let autoExport = Options.get("netexport.alwaysEnableAutoExport");
    if (autoExport) {
      if (!this.isActive()) {
        this.activate(toolbox);
      }
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

  activate: function(toolbox) {
    Trace.sysout("Automation.activate;");

    this.active = true;
    this.updateUI(toolbox);

    // xxxHonza: store network monitor instances into a map (or context)
    if (!toolbox.networkMonitor) {
      toolbox.networkMonitor = new NetworkMonitor({toolbox});
    }

    // If the token is set make sure the 'NetExport' global is
    // exposed into the page content (to the current Toolbox tab).
    let secretToken = Options.get("netexport.secretToken");
    if (secretToken) {
      this.registerDriverActor(toolbox);
    }
  },

  deactivate: function(toolbox) {
    Trace.sysout("Automation.deactivate;");

    this.active = false;
    this.updateUI(toolbox);

    if (toolbox.networkMonitor) {
      toolbox.networkMonitor.shutdown();
      toolbox.networkMonitor = null;
    }

    // If the token is set make sure the 'NetExport' global is
    // exposed into the page content (to the current Toolbox tab).
    let secretToken = Options.get("netexport.secretToken");
    if (secretToken) {
      this.unregisterDriverActor(toolbox);
    }
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

  updateUI: function(toolbox) {
    let chrome = main.Firebug.getChrome(toolbox);
    chrome.getPanelWhenReady("netmonitor").then(panel => {
      let isActive = this.isActive();
      let doc = panel.panelWin.document;
      let exportButton = doc.getElementById("netExport");

      if (isActive) {
        exportButton.classList.add("active");
      } else {
        exportButton.classList.remove("active");
      }

      let tooltipKey = "netexport.button.tooltip.Export HTTP Tracing";
      if (isActive) {
        tooltipKey += " Active";
      }

      exportButton.setAttribute("tooltiptext", Locale.$STR(tooltipKey));
    });
  },
};

target.register(Automation);

// Exports from this module
exports.Automation = Automation;
