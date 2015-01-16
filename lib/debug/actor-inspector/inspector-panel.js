/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");

const { BasePanel } = require("../../chrome/base-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Tool } = require("dev/toolbox");
const { Locale } = require("../../core/locale.js");

/**
 * @panel TODO docs
 */
const ActorInspectorPanel = Class(
/** @lends ActorInspectorPanel */
{
  extends: BasePanel,

  label: Locale.$STR("actorInspector.panel.title"),
  tooltip: Locale.$STR("actorInspector.panel.tip"),
  icon: "./icon-16.png",
  url: "./actor-inspector.html",

  setup: function({debuggee, frame}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("ActorInspectorPanel.setup;", frame);
  },

  onReady: function() {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("ActorInspectorPanel.onReady;");

    this.debuggee.start();
    this.postMessage("RDP", [this.debuggee]);

    // Load content script and handle 'onSendMessage' sent from it.
    let { messageManager } = this.panelFrame.frameLoader;
    let url = self.data.url("helloWorldContentScript.js");
    messageManager.loadFrameScript(url, false);
    messageManager.addMessageListener("message", this.onMessage.bind(this));
  },

  onLoad: function() {
    BasePanel.prototype.onLoad.apply(this, arguments);

    Trace.sysout("ActorInspectorPanel.onLoad;");
  },

  onError: function() {
    // xxxHonza: fix me:
    // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=980410#c16
    //BasePanel.prototype.onError.apply(this, arguments);

    Trace.sysout("ActorInspectorPanel.onError;");
  },

  onMessage: function(event) {
    Trace.sysout("ActorInspectorPanel.onMessage; (from content)", event);
  },

  getSidePanels: function() {
    return [];
  },

  /**
   * Returns list of buttons that should be displayed within
   * the panel toolbar.
   */
  getPanelToolbarButtons: function() {
    let buttons = [];

    buttons.push({
      nol10n: true,
      image: self.data.url("./breakOn.svg"),
      tooltiptext: "This is a tooltip",
      command: this.onHello.bind(this)
    });

    buttons.push("-");

    buttons.push({
      nol10n: true,
      label: "Send Message",
      tooltiptext: "Send testing message to content script",
      command: this.onMessage.bind(this)
    });

    // xxxHonza: implement Menu
    buttons.push({
      nol10n: true,
      type: "menu",
      label: "My Popup Menu",
      tooltiptext: "This is a tooltip",
      items: this.getMenuButtonItems()
    });

    return buttons;
  },

  /**
   * Returns list of menu items for a toolbar menu-button.
   */
  getMenuButtonItems: function() {
    let items = [];

    items.push({
      nol10n: true,
      label: "Item 1",
      command: this.onHello.bind(this)
    });

    items.push({
      nol10n: true,
      label: "Item 2",
      items: this.getSubMenuItems()
    });

    items.push({
      nol10n: true,
      label: "Item 3",
      type: "checkbox",
      checked: true,
    });

    return items;
  },

  getSubMenuItems: function() {
    let items = [];

    items.push({
      nol10n: true,
      label: "Item 2-1",
      type: "radio",
    });

    items.push({
      nol10n: true,
      label: "Item 2-2",
      type: "radio",
    });

    items.push({
      nol10n: true,
      label: "Item 2-3",
      type: "radio",
      checked: true,
    });

    return items;
  },

  /**
   * Returns a list of menu items for panel options menu.
   */
  getOptionsMenuItems: function() {
    return this.getMenuButtonItems();
  },

  /**
   * Returns a list of menu items for panel context menu.
   */
  getContextMenuItems: function() {
    return this.getMenuButtonItems();
  },

  // Command handlers

  onHello: function() {
    Trace.sysout("Hello World!");
  },
});

// Panel registration
// xxxHonza: register only in 'development' mode
const actorInspectorTool = new Tool({
  name: "Actor Inspector Tool",
  panels: {
    actorInspector: ActorInspectorPanel
  }
});

// Exports from this module
exports.ActorInspectorPanel = ActorInspectorPanel;
