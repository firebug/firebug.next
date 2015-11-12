/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const main = require("../main.js");

const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { BasePanel } = require("./base-panel.js");
const { Win } = require("../core/window.js");
const { Theme } = require("./theme.js");

/**
 * Base object for panel overlays. Overlays are used to customize existing
 * panels.
 * Note that built-in panels are usually not based on SDK (dev/panel).
 *
 * The overlay is derived from {@BasePanel} since it shares the same
 * logic and API. As every panel needs to have an ID, overlay derives
 * its ID from the associated built-in panel.
 *
 * xxxHonza: should be renamed to PanelOverlay FIX ME
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

    this.toolbox = options.toolbox;
    this.chrome = options.chrome;

    // Store reference to <iframe> that holds panel's content.
    // The frame is not loaded and not even inserted in the DOM
    // at this moment, and so it's possible to move it around
    // in derived Overlay object's initialize() method.
    this.panelFrame = options.panelFrame;

    // Map of side bar overlays.
    this.sideOverlays = new Map();
  },

  destroy: function() {
    BasePanel.prototype.destroy.apply(this, arguments);

    // Destroy all overlay instances.
    for (let overlay of this.sideOverlays.values()) {
      overlay.destroy();
    }
  },

  setupSideOverlays: function() {
    if (!this.sidebar) {
      return;
    }

    let overlays = this.getSideOverlays();
    if (!overlays) {
      return;
    }

    for (let overlay of overlays) {
      let overlayId = overlay.prototype.overlayId;
      if (!overlayId) {
        TraceError.sysout("baseOverlay.setupSideOverlays; ERROR " +
          "no overlay ID!");
        continue;
      }

      let panelFrame = this.getSidePanelFrame(overlayId);
      if (!panelFrame) {
        TraceError.sysout("baseOverlay.setupSideOverlays; ERROR " +
          "no panel frame");
        continue;
      }

      // Create instance of an overlay
      let instance = new overlay({
        owner: this,
        panelFrame: panelFrame,
        toolbox: this.toolbox,
        id: overlayId
      });

      this.sideOverlays.set(overlayId, instance);

      instance.onBuild({toolbox: this.toolbox});

      if (Theme.isFirebugActive()) {
        instance.applyTheme(panelFrame.contentWindow);
      }

      Win.loaded(panelFrame.contentWindow).then(doc => {
        instance.onReady({toolbox: this.toolbox});
      });
    }
  },

  search: function (nativeSearchBoxSelector, value) {
    let doc = this.getPanelDocument();
    let win = this.getPanelWindow();

    // Inject the searched pattern to the native search box.
    // xxxHonza: The search box UI will be built-in at some point
    // see: https://bugzilla.mozilla.org/show_bug.cgi?id=1026479
    // As soon as the bug is fixed this code will change TESTME
    let nativeSearchBox = doc.querySelector(nativeSearchBoxSelector);
    nativeSearchBox.value = value;

    // Trigger the "command" event for the native search box
    // to apply the filter.
    let event = doc.createEvent("xulcommandevent");
    event.initCommandEvent("command", true, true, win, 0, false, false, false,
        false, null);
    nativeSearchBox.dispatchEvent(event);
  },

  // Framework events

  /**
   * Executed by the framework when panel's frame is loaded.
   */
  onBuild: function(options) {
    Trace.sysout("baseOverlay.onBuild; " + this.id, options);

    if (!options.panel) {
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
    if (this.panel && this.panel.sidebar) {
      this.sidebar = this.panel.sidebar;
    }

    this.setupSidePanels();
    this.setupSideOverlays();

    if (this.searchable && Theme.isFirebugActive()) {
      this.updateSearchBox(true);
    }
  },

  onApplyTheme: function (win, oldTheme) {
    BasePanel.prototype.onApplyTheme.apply(this, arguments);

    Trace.sysout("baseOverlay.onApplyTheme;");

    if (this.searchable) {
      Win.loaded(win).then(() => this.updateSearchBox(true));
    }
  },

  onUnapplyTheme: function (win, newTheme) {
    BasePanel.prototype.onUnapplyTheme.apply(this, arguments);

    Trace.sysout("baseOverlay.onUnapplyTheme;");

    if (this.searchable) {
      Win.loaded(win).then(() => this.updateSearchBox(false));
    }
  },

  onShow: function() {
    BasePanel.prototype.onShow.apply(this, arguments);

    if (this.searchable && Theme.isFirebugActive()) {
      this.updateSearchBox(true);
    }
  },

  onHide: function() {
    BasePanel.prototype.onHide.apply(this, arguments);

    // Unapply search-box customization when the Inspector panel
    // is hidden (unselected). The search box is shared among
    // panels and other customization can apply.
    if (this.searchable) {
      this.updateSearchBox(false);
    }
  },

  // getters

  getSideOverlays: function() {
    return [];
  },

  /**
   * Returns unique ID of the overlay. The ID is the same as ID of
   * the associated (overlaid) panel.
   */
  get id() {
    return this.overlayId;
  },

  getPanel: function() {
    return this.panel;
  }
});

// Exports from this module
exports.BaseOverlay = BaseOverlay;
