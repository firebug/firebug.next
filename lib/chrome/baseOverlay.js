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

    Trace.sysout("baseOverlay.initialize; " + options.id, options);

    this.overlayId = options.id;
    this.panelFrame = options.panelFrame;
  },

  destroy: function() {
  },

  /**
   * Executed by the framework when a panel instance is created.
   */
  onBuild: function(options) {
    Trace.sysout("baseOverlay.onBuild; " + this.overlayId, options);
  },

  /**
   * Executed by the framework when panel's inner iframe is loaded.
   */
  onReady: function(options) {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("baseOverlay.onReady; " + this.overlayId, options);

    // xxxHonza: The reference to the overlaid panel instance is currently
    // passed by sdk/toolboxPatch module. Please, create bugzilla report
    // and ask for new API. FIX ME
    // See: Bug 1059727 - New API: Toolbox panel initialization events
    this.panel = options.panel;
    this.panel.panelOverlay = this;
  },

  get id() {
    return this.overlayId;
  }
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
