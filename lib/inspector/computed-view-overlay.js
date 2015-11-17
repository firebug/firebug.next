/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { SidePanelOverlay } = require("firebug.sdk/lib/side-panel-overlay.js");
const { Menu } = require("firebug.sdk/lib/menu.js");

/**
 * @overlay This object represents an overlay for 'Computed' side
 * panel within the Inspector panel. All (theme) customization
 * and/or new features should be implemented in this object.
 *
 * this.owner => {@InspectorOverlay}
 * this.owner.panel => {@InspectorPanel}
 * this.owner.panel.sidebar => {@ToolSidebar}
 * this.panelFrame => "chrome://browser/content/devtools/computedview.xhtml"
 * this.panelFrame.computedview => {@ComputedViewTool}
 * this.panelFrame.computedview.view => {@ComputedView.CssHtmlTree}
 */
const ComputedViewOverlay = Class(
/** @lends ComputedViewOverlay */
{
  extends: SidePanelOverlay,

  overlayId: "computedview",

  onReady: function(options) {
    SidePanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("computedViewOverlay.initialize;", options);

    this.panel = this.panelFrame.contentWindow.computedview;
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
      this.showBrowserStyles(),
    ];
  },

  showBrowserStyles: function() {
    let doc = this.getPanelDocument();
    let checkbox = doc.querySelector(".includebrowserstyles");

    return {
      label: "inspector.option.showBrowserStyles",
      type: "checkbox",
      checked: checkbox.checked,
      tooltiptext: "inspector.option.tip.showBrowserStyles",
      command: () => checkbox.click()
    };
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/computed-view.css", "author");

    // xxxHonza: check that the original checkbox still exists TESTME
    let doc = win.document;
    let checkbox = doc.querySelector(".includebrowserstyles");
    if (checkbox) {
      checkbox.setAttribute("fb-collapsed", "true");
    }
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/computed-view.css", "author");

    let doc = win.document;
    let checkbox = doc.querySelector(".includebrowserstyles");
    if (checkbox) {
      checkbox.removeAttribute("fb-collapsed");
    }
  },
});

// Exports from this module
exports.ComputedViewOverlay = ComputedViewOverlay;
