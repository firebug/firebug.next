/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

var self = require("sdk/self");
var main = require("../main.js");

const { BasePanel } = require("../chrome/basePanel");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("../core/trace.js");
const { Tool } = require("dev/toolbox");
const { Locale } = require("../core/locale.js");
const { HelloWorldSidePanel1 } = require("./helloWorldSidePanel1.js");
const { HelloWorldSidePanel2 } = require("./helloWorldSidePanel2.js");

/**
 * An example panel object. This object shows how to create a new panel
 * within the {@Toolbox} and customize its behavior through framework
 * hooks.
 */
const HelloWorldPanel = Class(
/** @lends HelloWorldPanel */
{
  extends: BasePanel,

  label: Locale.$STR("helloWorldPanelTitle"),
  tooltip: "Debug client example",
  icon: "./icon-16.png",
  url: "./helloWorld.html",

  setup: function({debuggee, frame}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("helloWorldPanel.setup;", frame);

    this.frame = frame;
  },

  onReady: function() {
    Trace.sysout("helloWorldPanel.onReady;");

    this.debuggee.start();
    this.postMessage("RDP", [this.debuggee]);

    // Load content script and handle 'onSendMessage' sent from it.
    let { messageManager } = this.frame.frameLoader;
    let url = self.data.url("helloWorldContentScript.js");
    messageManager.loadFrameScript(url, false);
    messageManager.addMessageListener("message", this.onMessage.bind(this));
  },

  onMessage: function(event) {
    Trace.sysout("helloWorldPanel.onMessage; (from content)", event);
  },

  getSidePanels: function() {
    return [HelloWorldSidePanel1, HelloWorldSidePanel2];
  },

  /**
   * Returns list of buttons that should be displayed within
   * the panel toolbar.
   */
  getPanelToolbarButtons: function() {
    var buttons = [];

    buttons.push({
      image: self.data.url("./breakOn.svg"),
      tooltiptext: "This is a tooltip",
      command: this.onHello.bind(this)
    });

    buttons.push("-");

    buttons.push({
      label: "Send Message",
      tooltiptext: "Send testing message to content script",
      command: this.onMessage.bind(this)
    });

    // xxxHonza: implement Menu
    buttons.push({
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
    var items = [];

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
    var items = [];

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
const helloWorldTool = new Tool({
  name: "Hello World Tool",
  panels: {
    helloWorld: HelloWorldPanel
  }
});

// Exports from this module
exports.HelloWorldPanel = HelloWorldPanel;
