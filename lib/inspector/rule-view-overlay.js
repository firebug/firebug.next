/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { SidePanelOverlay } = require("../chrome/sidePanelOverlay.js");
const { Menu } = require("../chrome/menu.js");

/**
 * @overlay This object represents an overlay for the 'Rules' side
 * panel. It is responsible for all (theme) customizations and new
 * features related to this side panel.
 */
const RuleViewOverlay = Class(
/** @lends RuleViewOverlay */
{
  extends: SidePanelOverlay,

  // Initialization

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.initialize;", options);

    this.onCssRuleViewRefreshed = this.onCssRuleViewRefreshed.bind(this);

    // Register an event listener for 'CssRuleViewRefreshed' event.
    // The event is fired by the platform when the rule-view is
    // populated with data (CSS rules).
    let doc = this.getPanelDocument();
    doc.addEventListener("CssRuleViewRefreshed",
      this.onCssRuleViewRefreshed, false);
  },

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.onReady;", options);

    this.panel = this.panelFrame.contentWindow.ruleview;
  },

  onCssRuleViewRefreshed: function(event) {
    Trace.sysout("ruleViewOverlay.onCssRuleViewRefreshed;", event);

    let doc = this.getPanelDocument();
    let ruleView = doc.querySelector(".ruleview");
    let entries = ruleView.querySelectorAll("div");

    // Iterate over all entries in the rule view. Some of the are
    // CSS Rules and some are headers (inherited from).
    let parentHeader;
    for (let entry of entries) {
      if (entry.classList.contains("ruleview-header")) {
        parentHeader = entry;
        FBTrace.sysout("parentHeader ", parentHeader);
      } else if (entry.classList.contains("ruleview-rule")) {
        if (parentHeader) {
          // xxxHonza: TESTME _ruleEditor must exist
          let ruleEditor = entry._ruleEditor;
          let rule = ruleEditor.rule;

          FBTrace.sysout("rule " + parentHeader.textContent, rule);

          // xxxHonza: render the rule within the parent header.
          // Use Element rep short tag to render.

          parentHeader = null;
        }
      }
    }
  },

  destroy: function() {
    SidePanelOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.destroy;", arguments);
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [];
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/rule-view.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/rule-view.css", "author");
  },
});

// Exports from this module
exports.RuleViewOverlay = RuleViewOverlay;
