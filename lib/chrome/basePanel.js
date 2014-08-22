/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Panel } = require("../sdk/panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");
const { Xul } = require("../core/xul.js");
const { when } = require("sdk/event/utils");
const { Theme } = require("./theme.js");
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { ToolSidebar } = devtools["require"]("devtools/framework/sidebar");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const { BOX, VBOX, HBOX, SPLITTER, TABBOX, TABS, TABPANELS } = Xul;

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 */
const BasePanel = Class(
/** @lends BasePanel */
{
  extends: Panel,

  initialize: function(options) {
    // xxxHonza: custom panels doesn't pass the 'panelFrame',
    // we might need a new hook in the SDK or different concept.
    let frame = options ? options.panelFrame : null;

    // Panel callback is executed only if the theme event has been
    // fired from a frame that is associated with the panel.
    let apply = (win, newTheme) => {
      if (frame.contentWindow === win)
        this.onApplyTheme(win, newTheme);
    };

    let unapply = (win, newTheme) => {
      if (frame.contentWindow === win)
        this.onUnapplyTheme(win, newTheme);
    };

    // Register theme listener to receive notifications
    // when Firebug theme is activated or deactivated.
    Theme.addThemeListeners(apply, unapply);

    this.sidePanels = new Map();
  },

  /**
   * Executed by the framework when event "load" is fired for the document.
   * (`document.readySate === "complete"`).
   */
  onLoad: function() {
    Trace.sysout("basePanel.onLoad;", this);
  },

  /**
   * This method is called to setup new panels. It isn't executed
   * for Panel overlays. Built in panel are already setup.
   */
  setup: function({debuggee, frame, toolbox}) {
    Trace.sysout("basePanel.setup;", arguments);

    this.panelFrame = frame;
    this.debuggee = debuggee;
    this.toolbox = toolbox;

    let parentNode = frame.parentNode;
    parentNode.style.MozBoxOrient = "horizontal";
    frame.style.visibility = "visible";

    // Definition of the new panel content layout.
    var content =
      HBOX({"class": "panelContent", "flex": "1"},
        VBOX({"id": "panelMainBox", "flex": "1"}),
        SPLITTER({"id": "panelSplitter", "valign": "top"},
          BOX({"id": "panelSplitterBox"})
        ),
        TABBOX({"id": "panelSideBox",
          "class": "devtools-sidebar-tabs",
          /*"width": "300px", default hide doesn't work*/
          "handleCtrlTab": "false"},
            TABS(),
            TABPANELS({"flex": "1"})
        )
      );

    // Build XUL DOM structure.
    var panelContent = content.build(parentNode);

    // Append a (inner) toolbar into the main panel.
    let mainBox = panelContent.querySelector("#panelMainBox");
    let mainToolbar = new PanelToolbar({
      parentNode: mainBox,
    });

    // Append the existing frame into the right location within
    // the new layout.
    mainBox.appendChild(frame);

    let items = this.getPanelToolbarButtons();
    if (items)
      mainToolbar.createItems(items);

    let sideBox = panelContent.querySelector("#panelSideBox");
    this.sidebar = new ToolSidebar(sideBox, this, "helloworldpanel-sidebar");
    this.sidebar.on("select", (event, toolId) => {
      // TODO: remember the last selected side panel.
    });

    this.setupSidePanels();
  },

  /**
   * Executed by the framework after document in the panel becomes
   * interactive (`document.readyState === "interactive"`).
   */
  onReady: function(options) {
    Trace.sysout("basePanel.onReady;", options);

    if (this.panelFrame)
      this.panelNode = this.panelFrame.contentDocument.body;
    else
      TraceError.sysout("basePanel.onReady; ERROR no frame", this);
  },

  // Side panels API

  getSidePanels: function() {
    return [];
  },

  setupSidePanels: function() {
    let sidePanels = this.getSidePanels();
    if (this.sidebar && (!sidePanels || !sidePanels.length)) {
      this.sidebar.hide();
      return;
    }

    if (!this.sidebar)
      return;

    for (let Panel of sidePanels) {
      const { url, label, tooltip, icon, id } = Panel.prototype;

      if (this.sidebar.getTab(id)) {
        continue;
      }

      this.sidebar.addTab(id, self.data.url(url), false);

      let xulPanel = this.sidebar.getTab(id);
      let panelFrame = xulPanel.querySelector("iframe");

      let panel = new Panel();
      this.sidePanels.set(id, panel);

      panel.setup({frame: panelFrame, toolbox: this.toolbox});

      // xxxHonza: can we use core/window.loaded?
      let onLoad = (event) => {
        panelFrame.removeEventListener("load", onLoad, true);
        this.onSidePanelLoad(event, id);
      };

      panelFrame.addEventListener("load", onLoad, true);
    }
  },

  onSidePanelLoad: function(event, id) {
    // Update panel tab title with localized version
    // xxxHonza: report request for better API.
    let tab = this.sidebar._tabs.get(id);
    let panel = this.sidePanels.get(id);
    tab.setAttribute("label", panel.label);

    // Get the side panel window from the target since
    // panelFrame.contentWindow isn't set when the <tabbox> is hidden.
    panel.onReady(event.target.defaultView);
  },

  removeSidePanels: function() {
    let sidePanels = this.getSidePanels();
    if (!this.sidebar || !sidePanels || !sidePanels.length) {
      return;
    }

    for (let Panel of sidePanels) {
      const { id } = Panel.prototype;

      // xxxHonza:
      // Missing API, blocked by: Bug 1055571 - New API: ToolSidebar.removeTab
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1055571
      if (this.sidebar.removeTab) {
        Trace.sysout("removeSidePanel: " + id)
        this.sidebar.removeTab(id);
      }

      this.sidePanels.delete(id);
    }
  },

  selectSidePanel: function(id) {
    this.sidebar.select(id);
  },

  // Panel toolbar

  getPanelToolbarButtons: function() {
    return null;
  },

  dispose: function() {
    Trace.sysout("basePanel.dispose;");
    delete this.debuggee;
  },

  show: function() {
    Trace.sysout("basePanel.show;");
  },

  /**
   * Returns a list of menu items for panel options menu.
   */
  getOptionsMenuItems: function() {
    return [];
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
  },

  // Theme

  /**
   * Executed by the framework when Firebug theme is applied.
   */
  onApplyTheme: function(iframeWin, oldTheme) {
  },

  /**
   * Executed by the framework when Firebug theme is unapplied.
   */
  onUnapplyTheme: function(iframeWin, newTheme) {
  },
});

// Exports from this module
exports.BasePanel = BasePanel;
