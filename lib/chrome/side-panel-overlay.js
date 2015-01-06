/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { TabMenu } = require("../chrome/tab-menu.js");

/**
 * @overlay
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
    if (!this.tabMenu) {
      this.tabMenu = new TabMenu(this, this.panelFrame.ownerDocument,
        "sidebar-tab-", this.owner.sidebar);
    }
  },
});

// Exports from this module
exports.SidePanelOverlay = SidePanelOverlay;
