/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

// Module object
var Options = {};

Options.getPref = function(name) {
  try {
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
  } catch (err) {
    TraceError.sysout("options.getPref; " + name + " ERROR " + err, err);
  }
}

Options.setPref = function(name, value) {
  try {
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
  } catch (err) {
    TraceError.sysout("options.setPref; " + name + " ERROR " + err, err);
  }
}

// Exports from this module
exports.Options = Options;
