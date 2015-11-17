/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

// Add-on SDK
const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { devtools, safeRequire } = require("firebug.sdk/lib/core/devtools.js");
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");

// Module paths changed:
//   https://bugzilla.mozilla.org/show_bug.cgi?id=912121
// Renaming (SelectorSearch -> InspectorSearch)
//   https://bugzilla.mozilla.org/show_bug.cgi?id=835896
const { SelectorSearch, InspectorSearch } = safeRequire(devtools,
  "devtools/client/inspector/inspector-search",
  "devtools/client/inspector/selector-search",
  "devtools/inspector/selector-search");

// Firebug.next
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
  extends: PanelOverlay,

  overlayId: "inspector",
  searchable: true,

  // Initialization

  onBuild: function(options) {
    PanelOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("inspectorOverlay.onBuild;", options.panel);

    this.originalsetupSearchBox = this.panel.setupSearchBox;
  },

  // Side panels

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
    PanelOverlay.prototype.onApplyTheme.apply(this, arguments);

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
    this.toggleSideBar = new ToggleSideBarButton({
      panel: this,
      toolbar: doc.getElementById("inspector-toolbar"),
    });
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    PanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    Trace.sysout("InspectorOverlay.onUnapplyTheme;", iframeWin);

    removeSheet(iframeWin, "chrome://firebug/skin/inspector.css", "author");
    removeSheet(iframeWin, "chrome://firebug-os/skin/inspector.css", "author");

    // Remove splitter customization
    Theme.customizeSideBarSplitter(iframeWin, false);

    this.toggleSideBar.destroy();

    this.sidebarOverlay.removeSidePanels();
  },

  // Search

  updateSearchBox: function(apply) {
    return;
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

  onSearch: function(value) {
    this.search("#inspector-searchbox", value);
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

    // searchSuggestions renamed to search in Firefox 45 (bug 835896)
    if (this.search) {
      this.search.destroy();
      this.search = null;
    }

    this.searchBox = searchBox.getInputBox();
    if (!this.searchBox) {
      Cu.reportError("Firebug.next ERROR: No search box!");
      return;
    }

    if (SelectorSearch) {
      this.searchSuggestions = new SelectorSearch(this, this.searchBox);
    } else {
      this.search = new InspectorSearch(this, this.searchBox);
    }
  }
});

// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
