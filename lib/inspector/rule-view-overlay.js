/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { SidePanelOverlay } = require("../chrome/sidePanelOverlay.js");
const { TabMenu } = require("../chrome/tabMenu.js");
const { Menu } = require("../chrome/menu.js");

/**
 * @overlay
 */
const RuleViewOverlay = Class(
/** @lends RuleViewOverlay */
{
  extends: SidePanelOverlay,

  // Initialization

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.initialize;", options);
  },

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.initialize;", options);
  },

  destroy: function() {
    SidePanelOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.destroy;", arguments);
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [];
  },

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/rule-view.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(win, "chrome://firebug/skin/rule-view.css", "author");
  },
});

// Exports from this module
exports.RuleViewOverlay = RuleViewOverlay;
