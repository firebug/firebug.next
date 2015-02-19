/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { Locale } = require("../../core/locale.js");
const { Url } = require("../../core/url.js");
const { Dom } = require("../../core/dom.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Menu } = require("../../chrome/menu.js");
const { Exporter } = require("./exporter.js");
const { Xul } = require("../../core/xul.js");
const { Win } = require("../../core/window.js");

const prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].
  getService(Ci.nsIPromptService);

// Xul builder creators.
const { PROGRESSMETER } = Xul;

/**
 * This object is responsible for uploading the result
 * HAR file onto a server.
 *
 * TODO: more docs
 */
var HarUploader =
/** @lends HarUploader */
{
  upload: function(context, confirm, async, items, jsonString, panelDoc) {
    Trace.sysout("HarUploader.upload;");

    try {
      var serverURL = Options.get("netexport.beaconServerURL");
      if (!serverURL) {
        return;
      }

      if (confirm && Options.get("netexport.sendToConfirmation")) {
        var uri = Url.makeURI(serverURL);
        var msg = Locale.$STR("netexport.sendTo.confirm.msg");
        msg = msg.replace(/%S/g, uri.host);

        let check = { value: false };
        let browser = getMostRecentBrowserWindow();
        if (!prompts.confirmCheck(browser, "NetExport", msg,
          Locale.$STR("netexport.sendTo.confirm.checkMsg"), check)) {
          return;
        }

        // Update sendToConfirmation confirmation option according to the value
        // of the dialog's "do not show again" checkbox.
        Options.set("netexport.sendToConfirmation", !check.value)
      }

      if (!jsonString) {
        let json = Exporter.buildJSON(context, items);
        jsonString = Exporter.buildData(json);
      }

      if (!jsonString) {
        return;
      }

      var pageURL = encodeURIComponent(context.getName());
      serverURL += "?url=" + pageURL;

      Trace.sysout("netexport.upload; " + serverURL, jsonString);

      // The instance is associated with the progress meter,
      // which is removed at the end.
      var uploader = new Uploader(serverURL, pageURL, async, panelDoc);
      uploader.start(jsonString);
    } catch (e) {
      TraceError.sysout("netexport.upload; EXCEPTION", e);
    }
  }
}

// Uploader Implementation

function Uploader(serverURL, pageURL, async, panelDoc) {
  this.serverURL = serverURL;
  this.pageURL = pageURL;
  this.request = null;
  this.progress = null;
  this.async = async;
  this.panelDoc = panelDoc;
}

/**
 * An instance of an upload. There can be more instances
 * (uploads in progress) at the same time.
 */
Uploader.prototype =
/** @lends Uploader */
{
  start: function(jsonString) {
    this.request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].
      createInstance(Ci.nsIXMLHttpRequest);
    this.request.upload.onprogress = this.onUploadProgress.bind(this);

    this.request.open("POST", this.serverURL, this.async);
    this.request.setRequestHeader("Content-Type", "x-application/har+json");

    // See https://github.com/firebug/netexport/issues/5
    //this.request.setRequestHeader("Content-Length", jsonString.length);

    this.request.onerror = this.onError.bind(this);
    this.request.onload = this.onFinished.bind(this);
    this.request.onabort = this.onAbort.bind(this);

    this.progress = this.createProgresMeter();

    this.request.send(jsonString);

    Trace.sysout("netexport.uploader.start; Request sent to: " +
      this.serverURL);
  },

  createProgresMeter: function() {
    var progress = PROGRESSMETER({
      "class": "netExportUploadProgress",
      mode: "determined",
      value: "0",
      collapsed: "true"
    });

    var netExportBtn = this.panelDoc.getElementById("netExport");
    progress = progress.build(netExportBtn.parentNode, {
      insertBefore: netExportBtn.nextSibling
    });

    progress.addEventListener("click",
      this.onContextMenu.bind(this), true);

    progress.setAttribute("tooltiptext",
      Locale.$STR("netexport.tooltip.Uploading_HAR_to") +
      " " + decodeURIComponent(this.serverURL));

    return progress;
  },

  onContextMenu: function(event) {
    // xxxHonza: TODO FIXME
    /*var popup = $("netExportUploadAbort");
    Dom.clearNode(popup);

    var abort = {
      label: "netexport.menu.label.Abort Upload",
      command: bind(this.abort, this)
    }

    Menu.createMenuItem(popup, abort);
    popup.showPopup(event.target, event.screenX, event.screenY,
      "popup", null, null);
    */
  },

  abort: function() {
    if (!this.request) {
      return;
    }

    this.request.abort();

    Trace.sysout("HarUploader.abort; " + this.serverURL);
  },

  onAbort: function(event) {
    Trace.sysout("HarUploader.onAbort;", event);

    // Remove progress bar from the UI.
    this.progress.parentNode.removeChild(this.progress);

    Trace.sysout("netexport.uploader.onAbort; ABORTED " +
      this.serverURL + " " + event.target.status, event);
  },

  onUploadProgress: function(event) {
    Trace.sysout("HarUploader.onUploadProgress; " + event.loaded, event);

    if (event.lengthComputable) {
      this.progress.removeAttribute("collapsed");
      var completed = (event.loaded / event.total) * 100;
      this.progress.setAttribute("value", Math.round(completed));
    }
  },

  onFinished: function(event) {
    Trace.sysout("HarUploader.onFinished;", event);

    // Remove progress bar from the UI.
    this.progress.remove();

    // If show preview is on, open the server page with details.
    if (!Options.get("netexport.showPreview")) {
      return;
    }

    var index = this.serverURL.indexOf("beacon/har");
    if (index < 0) {
      TraceError.sysout("netexport.uploader.onFinished; " +
        " ERROR wrong Beacon server: " + this.serverURL);
      return;
    }

    let showSlowURL = this.serverURL.substr(0, index);
    let lastChar = showSlowURL.charAt(showSlowURL.length - 1);

    if (lastChar != "/") {
      showSlowURL += "/";
    }

    // Compute URL of the details page (use URL of the exported page).
    showSlowURL += "details/?url=" + this.pageURL;

    Trace.sysout("netexport.uploader.onFinished; HAR Beacon sent, " +
      " open Beacon server: " + showSlowURL);

    Win.openNewTab(showSlowURL);
  },

  onError: function(event) {
    Trace.sysout("HarUploader.onError;", event);

    // Remove progress bar from the UI.
    this.progress.remove();

    TraceError.sysout("netexport.uploader.onError; ERROR " +
      this.serverURL + " " + event.target.status, event);

    // xxxHonza: alert("Error: " + event.target.status);
  }
};

// Exports from this module
exports.HarUploader = HarUploader;
