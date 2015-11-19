/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { Cu } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");
const { Menu } = require("firebug.sdk/lib/menu.js");
const { Xul } = require("firebug.sdk/lib/core/xul.js");
const { PanelToolbar } = require("firebug.sdk/lib/panel-toolbar.js");

// Firebug.next
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

// Constants
const persistPrefName = "devtools.webconsole.persistlog";

// Xul builder creators.
const { BOX, TOOLBARBUTTON, TABSCROLLBOX, MENUITEM } = Xul;

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Network panel.
 */
const NetworkOverlay = Class(
/** @lends NetworkOverlay */
{
  extends: PanelOverlay,

  overlayId: "netmonitor",
  searchable: true,

  initialize: function(options) {
    PanelOverlay.prototype.initialize.apply(this, arguments);
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
      Menu.globalOptionMenu("net.option.Disable_Browser_Cache",
        "devtools.cache.disabled",
        "net.option.tip.Disable_Browser_Cache"),
    ];
  },

  // Side Panels

  hasSidePanels: function() {
    return true;
  },

  toggleSidebar: function() {
    //xxxHonza: The built-in toggle logic could change TESTME
    let win = this.getPanelWindow();
    let closed = win.NetMonitorView._body.hasAttribute("pane-collapsed");
    win.NetMonitorView.Toolbar._onTogglePanesPressed();
    win.NetMonitorView.Sidebar.toggle(closed);
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    PanelOverlay.prototype.onApplyTheme.apply(this, arguments);

    Trace.sysout("networkOverlay.onApplyTheme;");

    // Remove the light theme support and load Network panel
    // specific stylesheet with Firebug theme.
    win.document.documentElement.classList.remove("theme-light");
    loadSheet(win, "chrome://firebug/skin/variables-view.css", "author");
    loadSheet(win, "chrome://firebug/skin/netmonitor.css", "author");
    loadSheet(win, "chrome://firebug-os/skin/netmonitor.css", "author");
    loadSheet(win, "chrome://firebug/skin/panel-content.css", "author");

    this.applyFirebugLayout(win);
  },

  onUnapplyTheme: function(win, newTheme) {
    PanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    Trace.sysout("networkOverlay.onUnapplyTheme;");

    removeSheet(win, "chrome://firebug/skin/panel-content.css", "author");
    removeSheet(win, "chrome://firebug-os/skin/netmonitor.css", "author");
    removeSheet(win, "chrome://firebug/skin/netmonitor.css", "author");
    removeSheet(win, "chrome://firebug/skin/variables-view.css", "author");

    this.unapplyFirebugLayout(win);
  },

  applyFirebugLayout: function(win) {
    Trace.sysout("networkOverlay.applyFirebugLayout;");

    let doc = win.document;

    // Create panel toolbar and populate it with buttons.
    let table = doc.getElementById("network-table");
    this.mainToolbar = new PanelToolbar({
      parentNode: table,
      insertBefore: table.firstChild,
    });

    // Get panel toolbar buttons
    let items = this.getPanelToolbarButtons();
    if (items) {
      this.mainToolbar.createItems(items);
    }

    // The rest of the buttons in the toolbar are filter buttons.
    // They are cloned from existing list of filter buttons in
    // the panel footer.
    let footer = doc.getElementById("requests-menu-footer");
    let buttons = footer.querySelectorAll(".requests-menu-filter-button");
    for (let button of buttons) {
      // Copy the original filter <button> and create <toolbarbutton>.
      TOOLBARBUTTON({
        id: button.id,
        label: button.label,
        checked: button.checked,
        "data-key": button.getAttribute("data-key")
      }).build(this.mainToolbar.toolbar);
    }

    // Bind filter buttons to the original handler
    // (needs automated test TESTME).
    let requestsMenu = win.NetMonitorView.RequestsMenu;
    this.mainToolbar.toolbar.addEventListener("click",
      requestsMenu.requestsMenuFilterEvent, false);

    // Customize the splitter. It's top part is located in between
    // the panel toolbar and side-panel tab list. It needs to match
    // the style.
    let splitter = doc.getElementById("network-inspector-view-splitter");
    this.splitterBox = BOX({"class": "panelSplitterBox"}).build(splitter);

    // Append tab scrolling box to the Network side panel.
    let sideBox = doc.querySelector(".devtools-sidebar-tabs");
    this.scrollBox = TABSCROLLBOX({
      orient: "horizontal"
    }).build(sideBox, {insertBefore: sideBox.tabpanels});

    let sideTabs = doc.querySelector(".devtools-sidebar-tabs tabs");
    this.scrollBox.appendChild(sideTabs);

    // Append toggle side bar button into the panel's toolbar
    this.toggleSideBar = new ToggleSideBarButton({
      panel: this,
      toolbar: this.mainToolbar.toolbar,
    });
  },

  unapplyFirebugLayout: function(win) {
    Trace.sysout("networkOverlay.unapplyFirebugLayout;");

    let doc = win.document;

    // Remove tab scrolling box from the side panel. Note that
    // Firefox 38 (Fx38) introduces another <toolbar> element around
    // <tabs> together with an 'alltabs' button with a context menu
    // listing all side-bar tabs. So, make sure to put the list of
    // <tabs> back into the right location (into the <toolbar> element)
    // The <toolbar> element has been later changed to <stack> element.
    let sideBox = doc.querySelector(".devtools-sidebar-tabs stack");
    if (!sideBox) {
      sideBox = doc.querySelector(".devtools-sidebar-tabs toolbar");
      if (!sideBox) {
        sideBox = doc.querySelector(".devtools-sidebar-tabs");
      }
    }

    sideBox.insertBefore(this.scrollBox.firstChild, sideBox.firstChild);

    // Remove Firebug theme specific UI
    this.mainToolbar.remove();
    this.splitterBox.remove();
    this.scrollBox.remove();
    this.toggleSideBar.destroy();
  },

  // Preferences

  onDevToolsPrefChanged: function(name) {
    let doc = this.getPanelDocument();

    if (name == persistPrefName) {
      let button = doc.getElementById("firebug-netmonitor-persist");
      button.checked = Services.prefs.getBoolPref(persistPrefName);
    }
  },

  // Panel Toolbar

  /**
   * Returns list of buttons for the Network panel toolbar.
   */
  getPanelToolbarButtons: function() {
    let buttons = [];

    buttons.push({
      id: "firebug-netmonitor-clear",
      label: "net.Clear",
      tooltiptext: "net.tip.Clear",
      command: this.onClear.bind(this)
    });

    buttons.push({
      id: "firebug-netmonitor-persist",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(persistPrefName),
      label: "net.Persist",
      tooltiptext: "net.tip.Persist",
      command: this.onPersist.bind(this)
    });

    buttons.push("-");

    return buttons;
  },

  updateSearchBox: function(apply) {
    let doc = this.getPanelDocument();

    // TODO test this
    if (apply) {
      // Copy search box value from the original search box.
      let netSearchBox =
        doc.querySelector("#requests-menu-filter-freetext-text");
      let overlay = this.chrome.getOverlay(this.toolbox,
        "FirebugToolboxOverlay");
      overlay.searchBox.setValue(netSearchBox.value);
    } else {
    }
  },

  onSearch: function(value) {
    this.search("#requests-menu-filter-freetext-text", value);
  },

  // Commands

  onClear: function() {
    // This needs automated test TESTME.
    let win = this.panelFrame.contentWindow;
    let requestsMenu = win.NetMonitorView.RequestsMenu;
    requestsMenu.reqeustsMenuClearEvent();
  },

  onPersist: function() {
    // This needs automated test TESTME.
    let value = Services.prefs.getBoolPref(persistPrefName);
    Services.prefs.setBoolPref(persistPrefName, !value);
  },
});

// Exports from this module
exports.NetworkOverlay = NetworkOverlay;
