/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { Menu } = require("../chrome/menu.js");
const { PanelToolbar } = require("../chrome/panel-toolbar.js");
const { Xul } = require("../core/xul.js");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Win } = require("../core/window.js");
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");

// Xul builder creators.
const { BOX, TOOLBARBUTTON, TABSCROLLBOX, MENUITEM } = Xul;

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Network panel.
 */
const NetworkOverlay = Class(
/** @lends NetworkOverlay */
{
  extends: BaseOverlay,

  overlayId: "netmonitor",
  searchable: true,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("NetworkOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("NetworkOverlay.onReady;", options);
  },

  destroy: function() {
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
    BaseOverlay.prototype.onApplyTheme.apply(this, arguments);

    Trace.sysout("networkOverlay.onApplyTheme;");

    // Remove the light theme support and load Network panel
    // specific stylesheet with Firebug theme.
    win.document.documentElement.classList.remove("theme-light");
    loadSheet(win, "chrome://firebug/skin/variables-view.css", "author");
    loadSheet(win, "chrome://firebug/skin/netmonitor.css", "author");
    loadSheet(win, "chrome://firebug-os/skin/netmonitor.css", "author");
    loadSheet(win, "chrome://firebug/skin/panel-content.css", "author");

    // Customize also the layout, but wait if the document
    // isn't loaded yet and the expected XUL structure in place.
    // This usually happens when the default theme is applied
    // automatically at the startup.

    // xxxHonza: this is how to handle exceptions according to:
    // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Promise#Handling_errors_and_common_pitfalls
    // But it means that we need to repeat it everywhere where Win.loaded
    // is used? It would be bad to do it once in Win.loaded?
    Win.loaded(win).then(() => this.applyFirebugLayout(win)).
      then(null, TraceError.sysout);
  },

  onUnapplyTheme: function(win, newTheme) {
    BaseOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    Trace.sysout("networkOverlay.onUnapplyTheme;");

    removeSheet(win, "chrome://firebug/skin/panel-content.css", "author");
    removeSheet(win, "chrome://firebug-os/skin/netmonitor.css", "author");
    removeSheet(win, "chrome://firebug/skin/netmonitor.css", "author");
    removeSheet(win, "chrome://firebug/skin/variables-view.css", "author");

    // Not sure if the user can manage to unapply the theme manually
    // before the document is loaded, but robots are fast, so check
    // the document ready status anyway.
    Win.loaded(win).then(() => this.unapplyFirebugLayout(win)).
      then(null, TraceError.sysout);
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

    this.originalFilterButtons = [];

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

      // Remove the original button from the UI, but store the reference
      // it'll be inserted back in case the Firebug theme is unapplied.
      // I can't believe somebody would like to unapply the Firebug theme,
      // but let's support it ;-)
      this.originalFilterButtons.push(button);
      button.remove();
    }

    // Hide the original 'clear' button in the UI.
    this.clearButton = doc.getElementById("requests-menu-clear-button");
    this.clearButton.setAttribute("fb-collapsed", "true");

    // Hide 'All Tabs' button. Firebug theme supports 'tabscrollbox'
    this.allTabsButton = doc.querySelector(".devtools-sidebar-alltabs");
    this.allTabsButton.setAttribute("fb-collapsed", "true");

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

    // Put all original filter buttons back to the footer.
    let footer = doc.getElementById("requests-menu-footer");
    let spacer = doc.getElementById("requests-menu-spacer");
    for (let button of this.originalFilterButtons) {
      footer.insertBefore(button, spacer);
    }

    // Make the original clear button visible again.
    this.clearButton.removeAttribute("fb-collapsed");

    // Make the 'All Tabs' button visible again.
    this.allTabsButton.removeAttribute("fb-collapsed");

    this.originalFilterButtons = [];

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
});

// Exports from this module
exports.NetworkOverlay = NetworkOverlay;
