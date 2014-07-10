/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Class } = require("sdk/core/heritage");
const { Trace } = require("../core/trace.js");
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
  onReady: function(panel) {
  },
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
