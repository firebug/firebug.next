/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { SidePanelOverlay } = require("firebug.sdk/lib/side-panel-overlay.js");
const { Menu } = require("firebug.sdk/lib/menu.js");

/**
 * @overlay This object represents an overlay for 'Animation' side
 * panel within the Inspector panel. All (theme) customization
 * and/or new features should be implemented in this object.
 *
 * this.owner => {@InspectorOverlay}
 */
const AnimationInspectorOverlay = Class(
/** @lends AnimationInspectorOverlay */
{
  extends: SidePanelOverlay,

  overlayId: "animationinspector",

  // Initialization

  onApplyTheme: function(win, oldTheme) {
    SidePanelOverlay.prototype.onApplyTheme.apply(this, arguments);

    loadSheet(win, "chrome://firebug/skin/animation-inspector.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    SidePanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    removeSheet(win, "chrome://firebug/skin/animation-inspector.css", "author");
  },
});

// Exports from this module
exports.AnimationInspectorOverlay = AnimationInspectorOverlay;
