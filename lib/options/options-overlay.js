/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const { Cu, Ci } = require("chrome");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { gDevTools } = require("firebug.sdk/lib/core/devtools.js");
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");
const { Options } = require("firebug.sdk/lib/core/options.js");

// Firebug.next

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Options panel.
 */
const OptionsOverlay = Class(
/** @lends OptionsOverlay */
{
  extends: PanelOverlay,

  overlayId: "options",

  // Initialization

  onApplyTheme: function(iframeWin, oldTheme) {
    Services.prefs.addObserver("devtools", this, false);
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Services.prefs.removeObserver("devtools", this, false);
  },

  // Preferences

  observe: function(subject, topic, data) {
    let event = {
      pref: data,
      newValue: Options.getPref(data),
    };

    switch (data) {
    case "devtools.cache.disabled":
      this.panel._prefChanged("pref-changed", event)
      break;
    }
  }
});

// Exports from this module
exports.OptionsOverlay = OptionsOverlay;
