/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { gDevTools } = require("firebug.sdk/lib/core/devtools.js");
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");
const { Options } = require("firebug.sdk/lib/core/options.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Options panel.
 */
const OptionsOverlay = Class(
/** @lends OptionsOverlay */
{
  extends: PanelOverlay,

  overlayId: "options",

  // Preferences

  onDevToolsPrefChanged: function(name) {
    let event = {
      pref: name,
      newValue: Options.getPref(name),
    };

    FBTrace.sysout("!!! options " + name, arguments);

    switch (name) {
    case "devtools.cache.disabled":
      this.panel._prefChanged("pref-changed", event)
      break;
    }
  },
});

// Exports from this module
exports.OptionsOverlay = OptionsOverlay;
