/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { BaseOverlay } = require("../chrome/base-overlay.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Options panel.
 */
const OptionsOverlay = Class(
/** @lends OptionsOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("optionsOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("optionsOverlay.onReady;", options);
  },

  destroy: function() {
    Trace.sysout("optionsOverlay.destroy;", arguments);
  },

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
      newValue: GetPref(data),
    };

    switch (data) {
    case "devtools.cache.disabled":
      this.panel._prefChanged("pref-changed", event)
      break;
    }
  }
});

// Helpers

// xxxHonza: move to core/options FIXME
function GetPref(name) {
  let type = Services.prefs.getPrefType(name);
  switch (type) {
    case Services.prefs.PREF_STRING:
      return Services.prefs.getCharPref(name);
    case Services.prefs.PREF_INT:
      return Services.prefs.getIntPref(name);
    case Services.prefs.PREF_BOOL:
      return Services.prefs.getBoolPref(name);
    default:
      throw new Error("Unknown type");
  }
}

function SetPref(name, value) {
  let type = Services.prefs.getPrefType(name);
  switch (type) {
    case Services.prefs.PREF_STRING:
      return Services.prefs.setCharPref(name, value);
    case Services.prefs.PREF_INT:
      return Services.prefs.setIntPref(name, value);
    case Services.prefs.PREF_BOOL:
      return Services.prefs.setBoolPref(name, value);
    default:
      throw new Error("Unknown type");
  }
}

// Exports from this module
exports.OptionsOverlay = OptionsOverlay;
