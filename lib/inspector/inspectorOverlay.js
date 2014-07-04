/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");

Cu.import("resource://gre/modules/Services.jsm");

/**
 * @overlay This object is responsible for the Inspector panel
 * customization. It appends a DOM side panel displaying properties
 * of the selected node among other things.
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

    doc.documentElement.classList.add("theme-firebug");
    doc.documentElement.classList.remove("theme-light");

    loadSheet(panel.panelWin,
      self.data.url("firebug-theme/inspector.css", "author"));
    loadSheet(panel.panelWin,
      self.data.url("firebug-theme/toolbox.css", "author"));
    loadSheet(panel.panelWin,
      self.data.url("firebug-theme/toolbars.css", "author"));

    // xxxHonza: try to wire up the built-in ToolSidebar API
    // for every panel. The API should be nicely wrapped
    // in DevTools SDK.
    let prefName = "devtools.inspector.activeSidebar"
    let defaultTab = Services.prefs.getCharPref(prefName);
    panel.sidebar.addTab("dom", self.data.url("dom.html"),
      "dom" == defaultTab);
  },

  destroy: function() {
  },
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
