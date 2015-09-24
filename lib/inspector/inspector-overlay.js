/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

// Add-on SDK
const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { devtools, safeRequire } = require("firebug.sdk/lib/core/devtools.js");

// https://bugzilla.mozilla.org/show_bug.cgi?id=912121
const { SelectorSearch } = safeRequire(devtools,
  "devtools/client/inspector/selector-search",
  "devtools/inspector/selector-search");

// Firebug
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { Theme } = require("../chrome/theme.js");
const { Win } = require("../core/window.js");
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");
const { RuleViewOverlay } = require("./rule-view-overlay.js");
const { ComputedViewOverlay } = require("./computed-view-overlay.js");
const { FontInspectorOverlay } = require("./font-inspector-overlay.js");
const { LayoutViewOverlay } = require("./layout-view-overlay.js");
const { AnimationInspectorOverlay } = require("./animation-inspector-overlay.js");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * @overlay This object is responsible for the Inspector panel
 * customization.
 *
 * It should append DOM side panel displaying properties of the
 * selected node (if Firebug theme is activated). Blocked by:
 * New API: WalkerFront.getObjectActorFromNodeActor()
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1035742
 */
const InspectorOverlay = Class(
/** @lends InspectorOverlay */
{
  extends: BaseOverlay,

  overlayId: "inspector",
  searchable: true,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("inspectorOverlay.initialize;", options);
  },

  onBuild: function(options) {
    BaseOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("inspectorOverlay.onBuild;", options.panel);

    this.originalsetupSearchBox = this.panel.setupSearchBox;
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("inspectorOverlay.onReady;", options);

    if (Theme.isFirebugActive()) {
      this.updateSearchBox(true);
    }
  },

  destroy: function() {
  },

  // Side panels

  hasSidePanels: function() {
    return true;
  },

  setupSidePanels: function() {
    if (Theme.isFirebugActive()) {
      BaseOverlay.prototype.setupSidePanels.apply(this, arguments);
    }
  },

  getSideOverlays: function() {
    return [
      RuleViewOverlay,
      ComputedViewOverlay,
      FontInspectorOverlay,
      LayoutViewOverlay,
      AnimationInspectorOverlay
    ];
  },

  // Events

  onApplyTheme: function(iframeWin, oldTheme) {
    Trace.sysout("inspectorOverlay.onApplyTheme; " + iframeWin.inspector,
      iframeWin);

    // xxxHonza: for now we don't need default theme, but
    // this is rather a hack FIX ME.
    let doc = iframeWin.document;
    let classList = doc.documentElement.classList;
    classList.remove("theme-light");

    loadSheet(iframeWin, "chrome://firebug/skin/inspector.css", "author");
    loadSheet(iframeWin, "chrome://firebug-os/skin/inspector.css", "author");

    Theme.customizeSideBarSplitter(iframeWin, true);

    // Create side bar toggle button.
    Win.loaded(iframeWin).then(doc => {
      this.toggleSideBar = new ToggleSideBarButton({
        panel: this,
        toolbar: doc.getElementById("inspector-toolbar"),
      });

      this.updateSearchBox(true);
    });

    this.setupSidePanels();
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    removeSheet(iframeWin, "chrome://firebug/skin/inspector.css", "author");
    removeSheet(iframeWin, "chrome://firebug-os/skin/inspector.css", "author");

    // Remove splitter customization
    Theme.customizeSideBarSplitter(iframeWin, false);

    this.toggleSideBar.destroy();

    this.removeSidePanels();

    Win.loaded(iframeWin).then(doc => {
      this.updateSearchBox(false);
    });
  },

  // Framework events

  onShow: function() {
    BaseOverlay.prototype.onShow.apply(this, arguments);

    if (Theme.isFirebugActive()) {
      this.updateSearchBox(true);
    }
  },

  onHide: function() {
    BaseOverlay.prototype.onHide.apply(this, arguments);

    // Unapply search-box customization when the Inspector panel
    // is hidden (unselected). The search box is shared among
    // panels and other customization can apply.
    this.updateSearchBox(false);
  },

  // Search

  updateSearchBox: function(apply) {
    Win.loaded(this.toolbox.doc.defaultView).then(() => {
      if (!this.panel) {
        return;
      }

      let doc = this.getPanelDocument();
      let searchInput = doc.querySelector("#inspector-searchbox");

      if (apply) {
        let overlay = this.chrome.getOverlay(this.toolbox,
          "FirebugToolboxOverlay");

        overlay.searchBox.setValue(searchInput.value);

        this.panel.setupSearchBox = this.setupSearchBox.bind(
          this.panel, overlay.searchBox);
      } else {
        this.panel.setupSearchBox = this.originalsetupSearchBox;
      }

      this.panel.setupSearchBox();
    });
  },

  /**
   * xxxHonza: monkey patch for the {@InspectorPanel} that connects
   * the panel to the shared search box UI.
   */
  setupSearchBox: function(searchBox) {
    // Initiate the selectors search object.
    if (this.searchSuggestions) {
      this.searchSuggestions.destroy();
      this.searchSuggestions = null;
    }

    this.searchBox = searchBox.getInputBox();
    this.searchSuggestions = new SelectorSearch(this, this.searchBox);
  }
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
