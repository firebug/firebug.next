/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { Panel } = require("dev/panel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");
const { Xul } = require("../core/xul.js");
const { when } = require("sdk/event/utils");
const { Theme } = require("./theme.js");
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { ToolSidebar } = devtools["require"]("devtools/framework/sidebar");
const { createView } = require("dev/panel/view");
const { viewFor } = require("sdk/view/core");
const { once } = require("sdk/event/core");

const { BOX, VBOX, HBOX, SPLITTER, TABBOX, TABS, TABPANELS, IFRAME } = Xul;

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 */
const BasePanel = Class(
/** @lends BasePanel */
{
  extends: Panel,

  initialize: function(options) {
    Trace.sysout("basePanel.initialize; ", options);

    // xxxHonza: custom panels doesn't pass the 'panelFrame',
    // we might need a new hook in the SDK or different concept.
    let frame = options ? options.panelFrame : null;

    // Panel callback is executed only if the theme event has been
    // fired from a frame that is associated with the panel.
    let apply = (win, newTheme) => {
      if (frame && frame.contentWindow === win)
        this.onApplyTheme(win, newTheme);
    };

    let unapply = (win, newTheme) => {
      if (frame && frame.contentWindow === win)
        this.onUnapplyTheme(win, newTheme);
    };

    // Register theme listener to receive notifications
    // when Firebug theme is activated or deactivated.
    Theme.addThemeListeners(apply, unapply);

    this.sidePanels = new Map();
  },

  /**
   * Executed by the framework when panel frame needs be created.
   *
   * @return An instance of <iframe> element.
   */
  createView: function(document) {
    Trace.sysout("basePanel.createView; " + this.id);

    // Get the panel container element.
    let parentNode = document.getElementById("toolbox-panel-" + this.id);
    parentNode.style.MozBoxOrient = "horizontal";

    // Definition of the new panel content layout.
    var content =
      HBOX({"class": "panelContent", "flex": "1"},
        VBOX({"id": "panelMainBox", "flex": "1"}),
        SPLITTER({"id": "panelSplitter", "valign": "top"},
          BOX({"class": "panelSplitterBox"})
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

  onReady: function(options) {
    Trace.sysout("basePanel.onReady; " + this.id, options);

    this.panelNode = this.panelFrame.contentDocument.body;
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

  // Side panels API

  getSidePanels: function() {
    return [];
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

    // Iterate all provided side panel constructors and build
    // corresponding structure in the side-bar.
    for (let ctor of sidePanels) {
      const { id } = ctor.prototype;
      if (!this.sidebar.getTab(id))
        this.buildSidePanel(ctor);
    }
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
    panel.setup({frame: panelFrame, toolbox: this.toolbox});

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

// Override the original createView method.
createView.define(BasePanel, (panel, document) => panel.createView(document));

// Exports from this module
exports.BasePanel = BasePanel;
