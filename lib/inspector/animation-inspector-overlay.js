/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { SidePanelOverlay } = require("../chrome/side-panel-overlay.js");
const { Menu } = require("../chrome/menu.js");

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

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("animationOverlay.initialize;", options);
  },

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("animationOverlay.initialize;", options);
  },

  destroy: function() {
    SidePanelOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("animationOverlay.destroy;", arguments);
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/animation-inspector.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/animation-inspector.css", "author");
  },
});

// Exports from this module
exports.AnimationInspectorOverlay = AnimationInspectorOverlay;
