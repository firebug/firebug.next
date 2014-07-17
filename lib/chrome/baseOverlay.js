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

  /**
   * Executed by the framework when a panel instance is created.
   */
  onBuild: function(panel) {
  },

  /**
   * Executed by the framework when panel's inner iframe is loaded.
   */
  onReady: function(options) {
    BasePanel.prototype.onReady.apply(this, arguments);
  },
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
