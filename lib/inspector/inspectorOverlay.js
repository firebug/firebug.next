/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");

/**
 * @overlay TODO: description
 */
const InspectorOverlay = Class(
/** @lends InspectorOverlay */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("InspectorOverlay.initialize;", options);
  },

  onReady: function(options) {
    Trace.sysout("InspectorOverlay.onReady;", options);

    let panel = options.panel;
    let doc = panel.panelWin.document;
    let win = doc.documentElement;

    // xxxHonza: Theme light should be removed eventually
    //doc.documentElement.classList.remove("theme-light");
    doc.documentElement.classList.add("theme-firebug");

    loadSheet(panel.panelWin,
        self.data.url("firebug-theme/inspector.css", "author"));
  },

  destroy: function() {
  },
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
