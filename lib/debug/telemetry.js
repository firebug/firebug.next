/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Dispatcher } = require("firebug.sdk/lib/dispatcher.js");
const { Theme } = require("../chrome/theme.js");
const { System } = require("../core/system.js");

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
 * See http://telemetry.mozilla.org/ for aggregated data.
 *
 * xxxHonza: unregister histograms on uninstall?
 */
var FirebugTelemetry =
{
  initialize: function() {
    this.registerAddonHistogram(THEME_ACTIVE_FLAG);

    // Set a flag if Firebug theme is active.
    if (Theme.isFirebugActive()) {
      this.log(THEME_ACTIVE_FLAG, 1);
    }

    // TODO: collect other data
  },

  shutdown: function(reason) {
  },

  // Helpers

  getHistogram: function(histogramId) {
    try {
      return Telemetry.getAddonHistogram(ADDON_NAME, histogramId);
    } catch (err) {
      Trace.sysout("telemetry.getHistogram; EXCEPTION " + err, err);
    }
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
    let histogram = this.getHistogram(histogramId);
    if (histogram)
      return;

    try {
      // Order of arguments for registerAddonHistogram() changed in Firefox 36
      // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1069953
      // xxxHonza: can be removed when Fx36 is the MIN requirement FIXME
      if (System.versionIsAtLeast(36)) {
        // Firefox 36+
        Telemetry.registerAddonHistogram(
          ADDON_NAME,
          histogramId,
          Telemetry.HISTOGRAM_FLAG
        );
      } else {
        Telemetry.registerAddonHistogram(
          ADDON_NAME,
          histogramId,
          0, 0, 0,
          Telemetry.HISTOGRAM_FLAG
        );
      }
    } catch (err) {
      TraceError.sysout("telemetry.registerAddonHistogram; EXCEPTION " + err, err);
    }
  }
};

// Registration
Dispatcher.register(FirebugTelemetry);

// Exports from this module
exports.Telemetry = FirebugTelemetry;
