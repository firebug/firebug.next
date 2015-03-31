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
const { PanelToolbar, ToolbarButton } = require("./panel-toolbar.js");
const { Xul } = require("../core/xul.js");
const { when } = require("sdk/event/utils");
const { Theme } = require("./theme.js");
const { TabMenu } = require("./tab-menu.js");
const { createView } = require("dev/panel/view");
const { viewFor } = require("sdk/view/core");
const { once } = require("sdk/event/core");
const { TextSearch } = require("../chrome/text-search.js");
const { Dom } = require("../core/dom.js");
const { Css } = require("../core/css.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { Content } = require("../core/content.js");
const { Str } = require("../core/string.js");
const { Locale } = require("../core/locale.js");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { ToolSidebar } = devtools["require"]("devtools/framework/sidebar");
const EventEmitter = devtools["require"]("devtools/toolkit/event-emitter");

// Shortcuts
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

  searchable: false,

  initialize: function(options) {
    Trace.sysout("basePanel.initialize;", options);

    EventEmitter.decorate(this);

    this.sidePanels = new Map();

    // Register theme listener to receive notifications
    // when Firebug theme is activated or deactivated.
    let applyTheme = this.applyTheme.bind(this);
    let unapplyTheme = this.unapplyTheme.bind(this);
    Theme.addThemeListeners(applyTheme, unapplyTheme);

    this.initContext = this.initContext.bind(this);
    this.showContext = this.showContext.bind(this);
    this.hideContext = this.hideContext.bind(this);
    this.destroyContext = this.destroyContext.bind(this);
  },

  /**
   * Executed by the framework when an overlaid panel is destroyed.
   */
  destroy: function() {
    this.destroyTabMenu();

    if (this.toggleSideBar) {
      this.toggleSideBar.destroy();
    }

    this.chrome.off("initContext", this.initContext);
    this.chrome.off("showContext", this.showContext);
    this.chrome.off("hideContext", this.hideContext);
    this.chrome.off("destroyContext", this.destroyContext);
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
  createView: function(document, panelFrame) {
    Trace.sysout("basePanel.createView; " + this.id);

    // Get the panel container element.
    let parentNode = document.getElementById("toolbox-panel-" + this.id);

    // Definition of the new panel content layout.
    let content =
      HBOX({"class": "panelContent", "flex": "1"},
        VBOX({"id": "panelMainBox", "flex": "1"}),
        SPLITTER({"id": "panelSplitter", "class": "devtools-side-splitter",
          "valign": "top"},
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
    if (items) {
      mainToolbar.createItems(items);
    }

    // Build panel frame if default one isn't provided. Otherwise
    // just make sure the frame is inserted at the right location
    // in the DOM.
    if (!panelFrame) {
      panelFrame = IFRAME({
        "sandbox": "allow-scripts",
        "type": "content",
        "flex": "1",
        "id": "toolbox-panel-iframe-" + this.id,
        "transparent": true,
        "seamless": "seamless"}).build(mainBox);
    } else {
      // Insert the frame at the right location.
      mainBox.appendChild(panelFrame);
    }

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
  setup: function(options) {
    Trace.sysout("basePanel.setup;", options);

    let frame = options.frame || viewFor(this);
    let parentWin = frame.ownerDocument.defaultView;

    if (!frame) {
      TraceError.sysout("basePanel.setup; ERRO no panel frame!", options);
    }

    this.panelFrame = frame;
    this.debuggee = options.debuggee;
    this.toolbox = options.toolbox || main.Firebug.getToolbox(parentWin);
    this.chrome = main.Firebug.getChrome(this.toolbox);

    this.chrome.on("initContext", this.initContext);
    this.chrome.on("showContext", this.showContext);
    this.chrome.on("hideContext", this.hideContext);
    this.chrome.on("destroyContext", this.destroyContext);

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

    // xxxHonza: custom panels don't include the theme-switching.js file
    // and so, theme events are not fired for it FIX ME
    let win = this.getPanelWindow();
    loadSheet(win, "chrome://firebug/skin/panelbase.css", "author");

    /* xxxHonza: this shouldn't happen automatically.
    try {
      this.debuggee.start();
      this.postMessage("RDP", [this.debuggee]);
    }
    catch (err) {
      TraceError.sysout("inspectorPanel.onReady; ERROR " + err, err);
    }
    */

    // Load content script and handle 'onSendMessage' sent from it.
    let { messageManager } = this.panelFrame.frameLoader;
    if (messageManager) {
      let url = self.data.url("panel-frame-script.js");
      messageManager.loadFrameScript(url, false);
      messageManager.addMessageListener("message", this.onMessage.bind(this));

      let { Trace: contentTrace } = FBTrace.get("CONTENT");

      // xxxHonza: is this the best way how to share lib modules?
      // This needs generic (customizable) approach for each panel.
      // xxxHonza: should be done from within the frame script?
      let win = this.panelFrame.contentWindow;
      Content.exportIntoContentScope(win, Str, "Str");
      Content.exportIntoContentScope(win, Locale, "Locale");
      Content.exportIntoContentScope(win, contentTrace, "Trace");
      Content.exportIntoContentScope(win, TraceError, "TraceError");
    }
  },

  /**
   * Executed by the framework when the panel is selected in the toolbox.
   */
  onShow: function() {
    Trace.sysout("basePanel.show;");

    // Make sure the tab options menu is available.
    this.createTabMenu();
  },

  /**
   * Executed by the framework when the panel is un-selected in the toolbox.
   */
  onHide: function() {
    Trace.sysout("basePanel.hide;");
  },

  /**
   * Returns a number indicating the view's ability to inspect the object.
   * Zero means not supported, and higher numbers indicate specificity.
   */
  supportsObject: function(object) {
    return 0;
  },

  // Context

  initContext: function(context) {
  },

  showContext: function(context) {
  },

  hideContext: function(context) {
  },

  destroyContext: function(context) {
  },

  getContext: function() {
    return this.chrome.getContext();
  },

  // Selection

  select: function(object) {
    Trace.sysout("basePanel.select;", object);

    this.postCommand("select", object);
  },

  onSelection: function(object) {
  },

  // Chrome <-> Content Communication

  onMessage: function(msg) {
    Trace.sysout("basePanel.onMessage; (from panel content)", msg);

    let data = msg.data;
    switch (data.type) {
      case "selection":
        this.onSelection(data.object);
      break
    }
  },

  postCommand: function(id, data) {
    let { messageManager } = this.panelFrame.frameLoader;

    if (!messageManager) {
      Trace.sysout("basePanel.postCommand; No message manager! " + id,
        data);
      return;
    }

    Trace.sysout("basePanel.postCommand; " + id, data);

    messageManager.sendAsyncMessage("firebug/event/message", {
      type: "devtools:" + id,
      bubbles: false,
      cancelable: false,
      data: data,
      origin: this.url,
    });
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

  setupSidePanels: function() {
    let sidePanels = this.getSidePanels();

    Trace.sysout("basePanel.setupSidePanels; " + this.sidebar, sidePanels);

    if (!this.sidebar) {
      return;
    }

    // Hide the side bar if there are no side panels at all
    if (!this.hasSidePanels()) {
      this.sidebar.hide();
      return;
    }

    // Bail out if there are no custom side panels.
    if (!sidePanels || !sidePanels.length) {
      return;
    }

    let firstTabId;

    // Iterate all provided (custom) side panel constructors and build
    // corresponding structure in the side-bar.
    for (let ctor of sidePanels) {
      const { id } = ctor.prototype;

      if (!firstTabId) {
        firstTabId = id;
      }

      if (!this.sidebar.getTab(id)) {
        this.buildSidePanel(ctor);
      }
    }

    // Select the first panel by default.
    // xxxHonza: the last selected side panel for specific main
    // panel should be stored in preferences.
    if (firstTabId) {
      this.sidebar.select(firstTabId);
    }
  },

  /**
   * Returns an iframe associated with given side panel.
   *
   * @param {String} id ID of a side panel.
   */
  getSidePanelFrame: function(id) {
    // API changed in Firefox 38 (getTab replaced by getTabPanel).
    // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1101569
    let xulPanel;
    if (typeof this.sidebar.getTabPanel == "function") {
      xulPanel = this.sidebar.getTabPanel(id);
    }
    else {
      xulPanel = this.sidebar.getTab(id);
    }

    return xulPanel.querySelector("iframe");
  },

  buildSidePanel: function(ctor) {
    const { id, label, tooltip, icon, url } = ctor.prototype;

    Trace.sysout("basePanel.buildSidePanel; " + id, ctor);

    // Append new tab into the side bar.
    this.sidebar.addTab(id, self.data.url(url), false);

    let panelFrame = this.getSidePanelFrame(id);

    // The frame doesn't have type="content" set and so, the message
    // manager doesn't exist. To set the attribute we need to remove
    // it from the DOM since it must be set before the element is
    // inserted into the document - and append again.
    // The missing message manager should be fixed by:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1075490
    let parentNode = panelFrame.parentNode;
    parentNode.removeChild(panelFrame);
    panelFrame.setAttribute("type", "content");
    parentNode.appendChild(panelFrame);

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

    if (!panelFrame) {
      TraceError.sysout("basePanel.buildSidePanel; ERROR no panel frame!" + id);
      return;
    }

    panelFrame.addEventListener("load", onLoad, true);
  },

  onSidePanelLoad: function(event, id) {
    // Update panel tab title with localized version
    // xxxHonza: report request for better (localizable) API.
    let tab = this.sidebar._tabs.get(id);
    let panel = this.sidePanels.get(id);
    tab.setAttribute("label", panel.label);
    tab.setAttribute("tooltiptext", panel.tooltip);
    Trace.sysout("basePanel.onSidePanelLoad; " + id, panel);

    // Get the side panel window from the target since
    // panelFrame.contentWindow isn't set when the <tabbox> is hidden.
    panel.onReady({window: event.target.defaultView});
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
    if (this.sidebar) {
      this.sidebar.toggle();
    }
  },

  // Panel toolbar

  getPanelToolbarButtons: function() {
    return null;
  },

  // Tab Options Menu

  createTabMenu: function() {
    if (this.tabMenu) {
      return;
    }

    // The 'Options' panel doesn't have options.
    if (this.id == "options") {
      return;
    }

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

  // Search

  /**
   * Default search uses simple text selection inside the panel.
   */
  onSearch: function(text, reverse) {
    Trace.sysout("domPanel.onSearch; " + text);

    let doc = this.getPanelDocument();
    let caseSensitive = false;

    if (!text) {
      delete this.currentSearch;
      this.highlightNode(null);
      doc.defaultView.getSelection().removeAllRanges();
      return false;
    }

    var row;
    if (this.currentSearch && text === this.currentSearch.text) {
      row = this.currentSearch.findNext(true, undefined, reverse,
        caseSensitive);
    } else {
      this.currentSearch = new TextSearch(this.panelNode,
          this.findSearchResultContainer.bind(this));
      row = this.currentSearch.find(text, reverse, caseSensitive);
    }

    if (row) {
      let sel = doc.defaultView.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.currentSearch.range);

      Dom.scrollIntoCenterView(row, this.panelNode);

      this.highlightNode(row);
      return true;
    }
    else
    {
      doc.defaultView.getSelection().removeAllRanges();
      return false;
    }
  },

  /**
   * Returns a parent element for search match that should be
   * highlighted for a moment. This helps the user to locate
   * the search result quickly.
   * It returns direct parent node by default. Should be overridden
   * by derived objects to return custom parent element (e.g. table row
   * containing the search result).
   */
  findSearchResultContainer: function(node) {
    return node.parentNode;
  },

  /**
   * Called by search in the case something was found. This will highlight
   * the given node for a specific time-span. There's only one node
   * highlighted at a time.
   *
   * @param {Node} Node to highlight
   */
  highlightNode: function(node) {
    if (this.highlightedNode) {
      Css.cancelClassTimed(this.highlightedNode, "jumpHighlight");
    }

    this.highlightedNode = node;

    if (node) {
      Css.setClassTimed(node, "jumpHighlight");
    }
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
