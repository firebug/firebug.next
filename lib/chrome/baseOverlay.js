/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BasePanel } = require("./basePanel");

/**
 * Base object for panel overlays.
 */
const BaseOverlay = Class(
/** @lends BaseOverlay */
{
  extends: BasePanel,

  initialize: function(options) {
    BasePanel.prototype.initialize.apply(this, arguments);

    Trace.sysout("baseOverlay.initialize;", options);

    this.panelFrame = options.panelFrame;
  },

  destroy: function() {
  },

  /**
   * Executed by the framework when a panel instance is created.
   */
  onBuild: function(options) {
    Trace.sysout("baseOverlay.onBuild;", options);
  },

  /**
   * Executed by the framework when panel's inner iframe is loaded.
   */
  onReady: function(options) {
    BasePanel.prototype.onReady.apply(this, arguments);

    // xxxHonza: The reference to the overlaid panel instance is currently
    // passed by sdk/toolboxPatch module. Please, create bugzilla report
    // and ask for new API. FIX ME
    this.panel = options.panel;
    this.panel.panelOverlay = this;
  },
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
