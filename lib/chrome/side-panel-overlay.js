/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Class } = require("sdk/core/heritage");

// Firebug SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { TabMenu } = require("firebug.sdk/lib/tab-menu.js");

// Firebug.next
const { BaseOverlay } = require("../chrome/base-overlay.js");

/**
 * Represents an overlay for side panels. Derived objects can customize
 * specific side panel in devtools.
 */
const SidePanelOverlay = Class(
/** @lends SidePanelOverlay */
{
  extends: BaseOverlay,

  // Initialization

  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("sidePanelOverlay.initialize;", options);

    this.owner = options.owner;
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("sidePanelOverlay.onReady;", options);
  },

  destroy: function() {
    BaseOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("sidePanelOverlay.destroy;", arguments);
  },

  createTabMenu: function() {
    if (this.tabMenu) {
      return;
    }

    this.tabMenu = new TabMenu({
      panel: this,
      toolbox: this.toolbox,
      tabIdPrefix: "sidebar-tab-",
      doc: this.panelFrame.ownerDocument,
      owner: this.owner.sidebar
    });

    this.tabMenu.createTabMenu();
  },
});

// Exports from this module
exports.SidePanelOverlay = SidePanelOverlay;
