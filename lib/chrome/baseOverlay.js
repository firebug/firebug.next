/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const main = require("../main.js");

const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BasePanel } = require("./basePanel");

/**
 * Base object for panel overlays. Overlays are used to customize existing
 * panels.
 * Note that built-in panels are usually not based on SDK (dev/panel).
 *
 * The overlay is derived from {@BasePanel} since it shares the same
 * logic and API. As every panel needs to have an ID, overlay derives
 * its ID from the associated built-in panel.
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
    this.toolbox = options.toolbox;
    this.chrome = main.Firebug.getChrome(options.toolbox);

    // Store reference to <iframe> that holds panel's content.
    // The frame is not loaded and not even inserted in the DOM
    // at this moment, and so it's possible to move it around
    // in derived Overlay object's initialize() method.
    this.panelFrame = options.panelFrame;
  },

  destroy: function() {
    BasePanel.prototype.destroy.apply(this, arguments);
  },

  /**
   * Executed by the framework when panel's frame is loaded.
   */
  onBuild: function(options) {
    Trace.sysout("baseOverlay.onBuild; " + this.id, options);

    if (!options.panel) {
      TraceError.sysout("baseOverlay.onReady; ERROR no panel? " + this.id);
      return;
    }

    this.panel = options.panel;
    this.panel._firebugPanelOverlay = this;
  },

  /**
   * Executed by the framework when panel's initialization is done
   * and the panel is fully ready.
   */
  onReady: function(options) {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("baseOverlay.onReady; " + this.id, options);

    // xxxHonza: the built-in panels should all use the {@ToolSidebar}
    // object. So far it's only the Console and Inspector panels.
    // The instance of the {@ToolSidebar} should be accessible through
    // panel.sidebar property. FIX ME, REPORT BUG
    if (this.panel && this.panel.sidebar)
      this.sidebar = this.panel.sidebar;

    this.setupSidePanels();
  },

  /**
   * Returns unique ID of the overlay. The ID is the same as ID of
   * the associated (overlaid) panel.
   */
  get id() {
    return this.overlayId;
  },
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
