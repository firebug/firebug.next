/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { Theme } = require("./theme.js");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

var browserStyleUrl = "chrome://firebug/skin/browser.css";

/**
 * TODO: description
 *
 * xxxHonza: it's currently related to global styles apply/unapply only.
 * We should transform the watcher into a generic API and base the browser
 * theme logic on it.
 * xxxHonza: we might want to rename to BrowserWatcher.
 */
var WindowWatcher =
/** @lends WindowWatcher */
{
  initialize: function() {
    this.onPrefChanged = this.onPrefChanged.bind(this);

    Services.obs.addObserver(watcher, "chrome-document-global-created", false);
    gDevTools.on("pref-changed", this.onPrefChanged);

    iterateWindows(win => this.openWindow(win));
  },

  shutdown: function() {
    Services.obs.removeObserver(watcher, "chrome-document-global-created", false);
    gDevTools.off("pref-changed", this.onPrefChanged);
  },

  // Preferences changes callback
  onPrefChanged: function(event, data) {
    Trace.sysout("windowWatcher.onPrefChanged;", data);

    if (data.pref != "devtools.theme")
      return;

    if (data.newValue == "firebug")
      this.onApplyTheme();
    else if (data.oldValue == "firebug")
      this.onUnapplyTheme();
  },

  onApplyTheme: function() {
    iterateWindows(win => this.load(win));
  },

  onUnapplyTheme: function() {
    iterateWindows(win => this.unload(win));
  },

  // Window open callback
  openWindow: function(win) {
    if (Theme.isFirebugActive()) {
      this.load(win);
    }
  },

  // Stylesheet load/unload API
  load: function(win) {
    loadSheet(win, browserStyleUrl, "author");
  },

  unload: function(win) {
    removeSheet(win, browserStyleUrl, "author");
  },
}

function iterateWindows(callback) {
  var enumerator = Services.wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    callback(enumerator.getNext());
  }
}

/**
 * TODO: description
 */
var watcher = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
  observe: function windowWatcher(win, topic, data) {
    // https://bugzil.la/795961 ?
    win.addEventListener("load", function onLoad(event) {
      // load listener not necessary once https://bugzil.la/800677 is fixed
      let win = event.currentTarget;
      win.removeEventListener("load", onLoad, false);

      let type = win.document.documentElement.getAttribute("windowtype");
      if (type == "navigator:browser") {
        WindowWatcher.openWindow(win);
      }
    }, false);
  }
};

// Exports from this module
exports.WindowWatcher = WindowWatcher;
