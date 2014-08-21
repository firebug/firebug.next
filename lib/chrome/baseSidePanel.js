/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const main = require("../main.js");

const { Panel } = require("../sdk/panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 *
 * xxxHonza: BaseSidePanel doesn't register theme changes listeners
 * and so doesn't support onApply/UnapplyTheme callbacks.
 * Note that basic support is done in {@BasePanel} object.
 */
const BaseSidePanel = Class(
/** @lends BaseSidePanel */
{
  extends: Panel,

  onReady: function(win) {
    Trace.sysout("BaseSidePanel.onReady;", this);

    // xxxHonza: it should be the {@Chrome} object automatically
    // registering and handling click events to any of the existing
    // panels (main and side). But when and how to do it?
    let body = win.document.body;
    body.addEventListener("click", this.onPanelClick.bind(this), true);
  },

  onLoad: function() {
    Trace.sysout("BaseSidePanel.onLoad;", this);
  },

  setup: function({frame}) {
    Trace.sysout("BaseSidePanel.setup;", arguments);
  },

  getPanelToolbarButtons: function() {
    return null;
  },

  show: function() {
    Trace.sysout("BaseSidePanel.show;");
  },

  getOptionsMenuItems: function() {
    return [];
  },

  supportsObject: function() {
    return false;
  },

  // xxxHonza: needs to be shared by all main and side panels.
  onPanelClick: function(event) {
    Trace.sysout("baseSidePanel.onPanelClick;", event);

    let chrome = main.Firebug.getChrome(this.toolbox);
    chrome.onPanelContentClick(event);
  },
});

// Exports from this module
exports.BaseSidePanel = BaseSidePanel;
