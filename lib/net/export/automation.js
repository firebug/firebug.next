/* See license.txt for terms of usage */

"use strict";

const main = require("../../main.js");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { target } = require("../../target.js");
const { Exporter } = require("./exporter.js");
const { HarUploader } = require("./har-uploader.js");
const { ExportUtils } = require("./export-utils.js");
const { NetworkMonitor } = require("./network-monitor.js");

/**
 * TODO: docs
 */
var Automation =
/** @lends Automation */
{
  active: false,

  onToolboxInitialize: function(toolbox) {
    Trace.sysout("Automation.onToolboxInitialize;");

    // Register as a listener into the http-observer in order to handle
    // onPageLoaded events. These are fired only if the auto-export feature
    // is activated.
    //HttpObserver.addListener(this);

    // Activate auto-export automatically if the preference says so.
    let autoExport = Options.getPref("netexport.alwaysEnableAutoExport");

    // xxxHonza: always enable for now.
    autoExport = true;
    if (autoExport) {
      if (!this.isActive()) {
        this.activate();
      }

      // xxxHonza: store network monitor instances into a map
      if (!toolbox.networkMonitor) {
        toolbox.networkMonitor = new NetworkMonitor({toolbox});
      }

      // Make sure Firebug's net observer is also activated.
      //if (httpObserver.registerObservers)
      //    httpObserver.registerObservers();
    }
  },

  onToolboxDestroy: function(toolbox) {
    Trace.sysout("Automation.onToolboxDestroy;");

    //HttpObserver.removeListener(this);

    if (toolbox.networkMonitor) {
      toolbox.networkMonitor.shutdown();
    }
  },

  // Activation

  isActive: function() {
    return this.active;
  },

  activate: function() {
    Trace.sysout("Automation.activate;");

    this.active = true;
    this.updateUI();

    // Make sure that cache entries are fetched automatically.
    //if (Firebug.NetMonitor.NetCacheReader) {
    //  Firebug.NetMonitor.NetCacheReader.autoFetch = true;
    //}

    //HttpObserver.register();

    // Expose "NetExport variable into all current contexts.
    /*Firebug.connection.eachContext(context => {
      this.exposeToContent(context.window);
    });*/
  },

  deactivate: function() {
    Trace.sysout("netexport.Automation: Auto export deactivated.");

    this.active = false;
    this.updateUI();

    // xxxHonza:
    //if (Firebug.NetMonitor.NetCacheReader)
    //    Firebug.NetMonitor.NetCacheReader.autoFetch = false;

    //HttpObserver.unregister();
  },

  // Content API
  // xxxHonza: needs to be done server side

  exposeToContent: function(win) {
    Trace.sysout("netexport.Automation; expose to content");

    var token = Options.get("netexport.secretToken");
    if (!token) {
      return;
    }

    var functions = {
      triggerExport: function() {
        Trace.sysout("netexport.Automation; user triggered export");
        //HttpObserver.onPageLoaded(win);
      },

      clear: function() {
        var context = TabWatcher.getContextByWindow(win);
        if (context)
          Firebug.NetMonitor.clear(context);
      }
    };

    // xxxHonza; properly expose using Cu.export*
    var props = {};
    var protectedFunctions = {};
    var protect = function(f) {
      return function(t) {
        if (t !== token) {
          Trace.sysout("netexport.Automation; invalid token");

          throw {
            name: "Invalid security token",
            message: "The provided security token is incorrect"
          };
        }

        var args = Array.prototype.slice.call(arguments, 1);
        return f.apply(this, args);
      };
    };

    for (var f in functions) {
      props[f] = "r";
      protectedFunctions[f] = protect(functions[f]);
    }

    Trace.sysout("netexport.Automation; helper functions exported to window");

    protectedFunctions.__exposedProps__ = props;

    win.wrappedJSObject.NetExport = protectedFunctions;
  },

  updateUI: function() {
    // xxxHonza: auto export button in the UI
    /*autoExportButton.setAttribute("state", this.active ? "active" : "inactive");
    autoExportButton.setAttribute("tooltiptext", this.active ?
      $STR("netexport.menu.tooltip.Deactivate Auto Export") :
      $STR("netexport.menu.tooltip.Activate Auto Export"));*/
  },

  // Callback, the page has been loaded.
  onPageLoaded: function(win) {
    Trace.sysout("netexport.Automation; PAGE LOADED : " + win);

   // HttpObserver.removePageObserver(win);

    var context = null;
    var json = Exporter.buildJSON(context, true);
    var jsonString = Exporter.buildData(json);

    // Store collected data into a HAR file (within default directory).
    if (Options.get("netexport.autoExportToFile")) {
      this.exportToFile(win, jsonString, context);
    }

    // Send collected data to the server.
    if (Options.get("netexport.autoExportToServer")) {
      HarUploader.upload(context, false, false, jsonString);
    }

    //xxxHonza: should preview be used for automation?
    /*if (Firebug.getPref(prefDomain, "showPreview"))
    {
        var viewerURL = Firebug.getPref(prefDomain, "viewerURL");
        if (viewerURL)
            Firebug.NetExport.ViewerOpener.openViewer(viewerURL, jsonString);
    }*/
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
