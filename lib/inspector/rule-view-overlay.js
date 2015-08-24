/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { SidePanelOverlay } = require("../chrome/side-panel-overlay.js");
const { Menu } = require("../chrome/menu.js");
const { Dom } = require("../core/dom.js");
const { Events } = require("../core/events.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { CssLogic } = devtools["require"]("devtools/styleinspector/css-logic");

/**
 * @overlay This object represents an overlay for the 'Rules' side panel.
 * It is responsible for all customizations and new features related to
 * this panel.
 */
const RuleViewOverlay = Class(
/** @lends RuleViewOverlay */
{
  extends: SidePanelOverlay,

  // Initialization

  initialize: function(options) {
    SidePanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("ruleViewOverlay.initialize;", options);

    this.inspectorOverlay = options.owner;

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
      } else if (entry.classList.contains("ruleview-rule")) {
        if (parentHeader) {
          // xxxHonza: TESTME _ruleEditor must exist
          let ruleEditor = entry._ruleEditor;
          let rule = ruleEditor.rule;
          let inherited = rule.inherited;

          Dom.clearNode(parentHeader);

          parentHeader.textContent = CssLogic._strings.formatStringFromName(
            "rule.inheritedFrom", [""], 1);

          // FIXME
          // xxxHonza: what we really need here is:
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1035742
          // let grip = WalkerFront.getObjectActorFromNodeActor(inherited);
          // let node = Element.shortTag.append({object: grip},
          //   parentHeader, Element);
          // It should happen synchronously if possible (to avoid UI
          // flickering).

          // Create temporary grip object for the template for now.
          let classList = inherited.className.split(" ");
          let object = {
            preview: {
              nodeName: inherited.nodeName,
              attributes: { "id": rule.inherited.id },
              classList: classList.filter(item => item.length)
            }
          };

          // Render the inherited element (short link).
          let node = ElementRep.shortTag.append({object: object},
            parentHeader, ElementRep);

          // xxxHonza: hack FIX ME, the listener must be registered
          // by {@Chrome} for all panel contents.
          let listener = this.onClickInheritedElement.bind(this, inherited);
          node.addEventListener("click", listener, true);

          parentHeader = null;
        }
      }
    }
  },

  onClickInheritedElement: function(inherited, event) {
    Events.cancelEvent(event);

    let inspectorPanel = this.inspectorOverlay.panel;
    inspectorPanel.selection.setNodeFront(inherited, "nodeselected");
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
    loadSheet(win, "chrome://firebug/skin/console.css", "author");
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/rule-view.css", "author");
    removeSheet(win, "chrome://firebug/skin/console.css", "author");
  },
});

// Exports from this module
exports.RuleViewOverlay = RuleViewOverlay;
