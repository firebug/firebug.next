/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { Panel } = require("dev/panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");
const { Xul } = require("../core/xul.js");
const { when } = require("sdk/event/utils");
const { Theme } = require("./theme.js");
const { TabMenu } = require("./tabMenu.js");
const { createView } = require("dev/panel/view");
const { viewFor } = require("sdk/view/core");
const { once } = require("sdk/event/core");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { ToolSidebar } = devtools["require"]("devtools/framework/sidebar");
const EventEmitter = devtools["require"]("devtools/toolkit/event-emitter");

const { BOX, VBOX, HBOX, SPLITTER, TABBOX, TABS, TABPANELS, IFRAME } = Xul;

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object. This object is also used for panel overlays - i.e. for
 * customization of built-in panels, see {@BaseOverlay}.
 */
const BasePanel = Class(
/** @lends BasePanel */
{
  extends: Panel,

  initialize: function(options) {
    Trace.sysout("basePanel.initialize;", options);

    EventEmitter.decorate(this);

    this.sidePanels = new Map();

    // Register theme listener to receive notifications
    // when Firebug theme is activated or deactivated.
    let applyTheme = this.applyTheme.bind(this);
    let unapplyTheme = this.unapplyTheme.bind(this);
    Theme.addThemeListeners(applyTheme, unapplyTheme);
  },

  /**
   * Executed by the framework when an overlaid panel is destroyed.
   */
  destroy: function() {
    this.destroyTabMenu();

    if (this.toggleSideBar) {
      this.toggleSideBar.destroy();
    }
  },

  /**
   * Executed by SDK framework for custom panels (not for overlays).
   */
  dispose: function() {
    Trace.sysout("basePanel.dispose;");

    this.destroy();

    delete this.debuggee;
  },

  /**
   * Executed by the framework when panel frame needs to be created.
   *
   * @return An instance of <iframe> element.
   */
  createView: function(document) {
    Trace.sysout("basePanel.createView; " + this.id);

    // Get the panel container element.
    let parentNode = document.getElementById("toolbox-panel-" + this.id);

    // Definition of the new panel content layout.
    let content =
      HBOX({"class": "panelContent", "flex": "1"},
        VBOX({"id": "panelMainBox", "flex": "1"}),
        SPLITTER({"id": "panelSplitter", "valign": "top"},
          BOX({"class": "panelSplitterBox"})
        ),
        TABBOX({"id": "panelSideBox",
          "class": "devtools-sidebar-tabs",
          "width": "300px",
          "handleCtrlTab": "false"},
            TABS(),
            TABPANELS({"flex": "1"})
        )
      );

    this.panelContent = content.build(parentNode);
    let mainBox = this.panelContent.querySelector("#panelMainBox");

    // Create a toolbar for the main panel.
    let mainToolbar = new PanelToolbar({
      parentNode: mainBox,
    });

    // Populate the toolbar with buttons defined by this panel.
    let items = this.getPanelToolbarButtons();
    if (items)
      mainToolbar.createItems(items);

    // Build panel frame.
    let panelFrame = IFRAME({
      "sandbox": "allow-scripts",
      "type": "content",
      "flex": "1",
      "transparent": true,
      "seamless": "seamless"}).build(mainBox);

    // Create side box and populate it by side-panels defined
    // by this panel instance.
    let sideBox = this.panelContent.querySelector("#panelSideBox");
    this.sidebar = new ToolSidebar(sideBox, this, this.id + "-sidebar");
    this.sidebar.on("select", (event, toolId) => {
      // TODO: remember the last selected side panel.
    });

    this.setupSidePanels();

    // Return the panel frame.
    return panelFrame;
  },

 /**
  * This method is called to setup new panels. It isn't executed
  * for Panel overlays. Built in panel are already setup.
  */
  setup: function({debuggee}) {
    Trace.sysout("basePanel.setup; ", debuggee);

    let frame = viewFor(this);
    let parentWin = frame.ownerDocument.defaultView;

    this.panelFrame = frame;
    this.debuggee = debuggee;
    this.toolbox = main.Firebug.getToolbox(parentWin);

    // The sdk/panel object registers automatically all methods
    // starting with 'on' as listeners. But only if they are defined
    // on the actually panel instance prototype
    // (see: Panel.setup => setListeners);
    // So, it doesn't include methods implemented in {@BasePanel}.
    // xxxHonza: related to why onReady, onLoad, onError, ...
    // doesn't have to be executed for every panel (if not defined in
    // the actual instance). FIX ME

    let proto = Object.getPrototypeOf(this);
    Trace.sysout("basePanel.setup; proto", proto);
  },

  onLoad: function() {
    Trace.sysout("basePanel.onLoad;");
  },

  /**
   * Exceptions that are thrown by panel listeners during the emit
   * are caught and handled by the following method.
   */
  onError: function(error) {
    Trace.sysout("basePanel.error;", error);
  },

  /**
   * Executed by the framework after document in the panel becomes
   * interactive (`document.readyState === "interactive"`).
   */
  onReady: function(options) {
    Trace.sysout("basePanel.onReady; " + this.id, options);

    this.panelNode = this.panelFrame.contentDocument.body;
  },

  /**
   * Executed by the framework when the panel is selected in the toolbox.
   */
  onSelected: function() {
    Trace.sysout("basePanel.onSelected; " + this.id);

    // Make sure the tab options menu is available.
    this.createTabMenu();
  },

  show: function() {
    Trace.sysout("basePanel.show;");
  },

  /**
   * Returns a number indicating the view's ability to inspect the object.
   * Zero means not supported, and higher numbers indicate specificity.
   */
  supportsObject: function(object) {
    return 0;
  },

  // Selection

  select: function(object) {
    Trace.sysout("basePanel.select;");
  },

  // Side panels API

  /**
   * Return list of side panels that should be created for this panel.
   */
  getSidePanels: function() {
    return [];
  },

  /**
   * Can be overridden by overlays to indicate that the (built-in)
   * panel has side panels even if there are no additional custom
   * panels appended.
   */
  hasSidePanels: function() {
    let panels = this.getSidePanels();
    return (panels && panels.length);
  },

  /**
   * Can be overridden by overlays to indicate that the sidebar is opened.
   *
   * @return {boolean} True if the panel has a sidebar and it is opened.
   */
  isSidebarOpened: function() {
    return this.sidebar && this.sidebar._tabbox && !this.sidebar._tabbox.hidden;
  },

  setupSidePanels: function() {
    let sidePanels = this.getSidePanels();

    Trace.sysout("basePanel.setupSidePanels; " + this.sidebar, sidePanels);

    if (!this.sidebar)
      return;

    if (!sidePanels || !sidePanels.length) {
      this.sidebar.hide();
      return;
    }

    let firstTabId;

    // Iterate all provided side panel constructors and build
    // corresponding structure in the side-bar.
    for (let ctor of sidePanels) {
      const { id } = ctor.prototype;

      if (!firstTabId)
       firstTabId = id;

      if (!this.sidebar.getTab(id))
        this.buildSidePanel(ctor);
    }

    // Select the first panel by default.
    // xxxHonza: the last selected side panel for specific main
    // panel should be stored in preferences.
    if (firstTabId)
      this.sidebar.select(firstTabId);
  },

  buildSidePanel: function(ctor) {
    const { id, label, tooltip, icon, url } = ctor.prototype;

    Trace.sysout("basePanel.buildSidePanel; " + id, ctor);

    // Append new tab into the side bar.
    this.sidebar.addTab(id, self.data.url(url), false);

    let xulPanel = this.sidebar.getTab(id);
    let panelFrame = xulPanel.querySelector("iframe");

    // Create instance of the side panel object and setup it.
    // xxxHonza: when main panels are created the frame is
    // not passed into the setup method (SDK design, see also issue #65).
    // Side panels API should behave similarly FIX ME.
    let panel = new ctor();
    this.sidePanels.set(id, panel);
    panel.setup({frame: panelFrame, toolbox: this.toolbox, owner: this});

    let onLoad = (event) => {
      panelFrame.removeEventListener("load", onLoad, true);
      this.onSidePanelLoad(event, id);
    };

    panelFrame.addEventListener("load", onLoad, true);
  },

  onSidePanelLoad: function(event, id) {
    // Update panel tab title with localized version
    // xxxHonza: report request for better (localizable) API.
    let tab = this.sidebar._tabs.get(id);
    let panel = this.sidePanels.get(id);
    tab.setAttribute("label", panel.label);

    Trace.sysout("basePanel.onSidePanelLoad; " + id, panel);

    // Get the side panel window from the target since
    // panelFrame.contentWindow isn't set when the <tabbox> is hidden.
    panel.onReady({window: event.target.defaultView});
    this.emit("side-panel-loaded", arguments);
  },

  removeSidePanels: function() {
    let sidePanels = this.getSidePanels();
    if (!this.sidebar || !sidePanels || !sidePanels.length) {
      return;
    }

    for (let Panel of sidePanels) {
      const { id } = Panel.prototype;

      Trace.sysout("removeSidePanel: " + id)

      this.sidebar.removeTab(id);
      this.sidePanels.delete(id);
    }
  },

  getSidePanel: function(id) {
    return this.sidePanels.get(id);
  },

  selectSidePanel: function(id) {
    this.sidebar.select(id);
  },

  toggleSidebar: function() {
    if (this.sidebar)
      this.sidebar.toggle();
  },

  // Panel toolbar

  getPanelToolbarButtons: function() {
    return null;
  },

  // Tab Options Menu

  createTabMenu: function() {
    if (this.tabMenu)
      return;

    // The 'Options' panel doesn't have options.
    if (this.id == "options")
      return;

    this.tabMenu = new TabMenu(this, this.toolbox.doc,
      "toolbox-tab-", this.toolbox);
  },

  destroyTabMenu: function() {
    if (this.tabMenu) {
      this.tabMenu.destroy();
      this.tabMenu = null;
    }
  },

  /**
   * Returns a list of menu items for panel options menu.
   */
  getOptionsMenuItems: function() {
    return [];
  },

  /**
   * Executed by the framework when the user clicks panel tab options
   * menu target. Returns custom menu popup for panel options.
   *
   * @returns {MenuPopup} The method can return custom <menupopup> element
   * that will be displayed when the user clicks the tab options target.
   */
  getOptionsMenuPopup: function() {
  },

  // Theme

  /**
   * Executed by the framework when Firebug theme is applied.
   * It's executed for every iframe (that includes theme-swithing.js file)
   * in the toolbox.
   */
  applyTheme: function(win, oldTheme) {
    let frame = this.panelFrame;
    if (frame && frame.contentWindow === win) {
      this.onApplyTheme(win, oldTheme);
      this.createTabMenu();
    }
  },

  /**
   * Executed by the framework when Firebug theme is unapplied.
   * It's executed for every iframe (that includes theme-swithing.js file)
   * in the toolbox.
   */
  unapplyTheme: function(win, newTheme) {
    let frame = this.panelFrame;
    if (frame && frame.contentWindow === win) {
      this.onUnapplyTheme(win, newTheme);
      this.destroyTabMenu();
    }
  },

  /**
   * Executed by the framework when Firebug theme is applied.
   * The method is executed only for the frame associated with
   * the current panel.
   *
   * xxxHonza: onApplyTheme and onUnapplyTheme are not executed for
   * custom panels that don't include theme-switching.js file in
   * the content document. Note that the document must have chrome
   * privileges.
   *
   * @param {Window} Window in the iframe the theme is applied to.
   * @param {@String} ID of the previous theme.
   */
  onApplyTheme: function(win, oldTheme) {
    Trace.sysout("basePanel.onApplyTheme;");
  },

  /**
   * Executed by the framework when Firebug theme is unapplied.
   * The method is executed only for the frame associated with
   * the current panel.
   *
   * @param {Window} Window in the iframe the theme is applied to.
   * @param {@String} ID of the new theme.
   */
  onUnapplyTheme: function(win, newTheme) {
    Trace.sysout("basePanel.onUnapplyTheme;");
  },

  /**
   * Returns content document of the panel frame.
   */
  getPanelDocument: function() {
    return this.panelFrame.contentDocument;
  },

  /**
   * Returns content window of the panel frame.
   */
  getPanelWindow: function() {
    return this.panelFrame.contentWindow;
  }
});

// Override the original createView method.
createView.define(BasePanel, (panel, document) => panel.createView(document));

// Exports from this module
exports.BasePanel = BasePanel;
