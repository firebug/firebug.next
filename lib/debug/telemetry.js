/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { target } = require("../target.js");
const { Theme } = require("../chrome/theme.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const Telemetry = Services.telemetry;

const ADDON_NAME = "Firebug";

// Register a histogram for Firebug theme (on/off)
const THEME_ACTIVE_FLAG = "THEME_ACTIVE_FLAG";

/**
 * This object is intended to collect various telemetry data and store
 * them into proper histograms. The object also defined useful API that
 * can be used from other modules.
 *
 * See http://arewesnappyyet.com for aggregated data.
 *
 * xxxHonza: unregister histograms on uninstall?
 */
var FirebugTelemetry =
{
  initialize: function(Firebug) {
    this.registerAddonHistogram(THEME_ACTIVE_FLAG);

    // Set a flag if Firebug theme is active.
    if (Theme.isFirebugActive()) {
      this.log(THEME_ACTIVE_FLAG, 1);
    }

    // TODO: collect other data
  },

  shutdown: function(Firebug) {
  },

  // Helpers

  getHistogram: function(histogramId) {
    return Telemetry.getAddonHistogram(ADDON_NAME, histogramId);
  },

  log: function(histogramId, value) {
    if (histogramId) {
      try {
        let histogram = this.getHistogram(histogramId);
        histogram.add(value);
      } catch(err) {
        TraceError.sysout("telemetry.log; EXCEPTION " + err, err);
      }
    }
  },

  registerAddonHistogram: function(histogramId) {
    try {
      let histogram = this.getHistogram(histogramId);
      if (histogram)
        return;

      Telemetry.registerAddonHistogram(
        ADDON_NAME,
        histogramId,
        0, 0, 0,
        Telemetry.HISTOGRAM_FLAG
      );
    } catch (err) {
      TraceError.sysout("telemetry.registerAddonHistogram; EXCEPTION " + err, err);
    }
  }
};

// Initialization

target.on("initialize", Firebug => {
  FirebugTelemetry.initialize(Firebug);
});

target.on("shutdown", Firebug => {
  FirebugTelemetry.shutdown(Firebug);
});

// Exports from this module
exports.Telemetry = FirebugTelemetry;
