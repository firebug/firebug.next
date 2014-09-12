/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BasePanel } = require("./basePanel");

/**
 * Base object for panel overlays. Overlays are used to customize existing
 * panels. Built-in panels are usually not based on Add-SDK (dev/panel).
 */
const BaseOverlay = Class(
/** @lends BaseOverlay */
{
  extends: BasePanel,

  /**
   * Executed by the framework when a panel instance is created.
   */
  initialize: function(options) {
    BasePanel.prototype.initialize.apply(this, arguments);

    Trace.sysout("baseOverlay.initialize; " + options.id, options);

    this.overlayId = options.id;

    // Store reference to <iframe> that holds panel's content.
    // The frame is not loaded and not even inserted in the DOM
    // at this moment, and so it's possible to move it around
    // in derived Overlay object's initialize() method.
    this.panelFrame = options.panelFrame;
  },

  destroy: function() {
  },

  /**
   * Executed by the framework when panel's frame is loaded.
   */
  onBuild: function(options) {
    Trace.sysout("baseOverlay.onBuild; " + this.overlayId, options);
  },

  /**
   * Executed by the framework when panel's initialization is done
   * and the panel is fully ready.
   */
  onReady: function(options) {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("baseOverlay.onReady; " + this.overlayId, options);

    this.panel = options.panel;
    this.panel.panelOverlay = this;
    this.sidebar = this.panel.sidebar;

    this.setupSidePanels();
  },

  get id() {
    return this.overlayId;
  },

  getPanelDocument: function() {
    return this.panelFrame.contentDocument;
  }
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
