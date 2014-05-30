/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { BasePanel } = require("./basePanel");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("./trace.js");
const { Tool } = require("dev/toolbox");
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");


/**
 * An example panel object. This object shows how to create a new panel
 * within the {@Toolbox} and customize its behavior through framework
 * hooks
 */
const HelloWorldPanel = Class({
  extends: BasePanel,

  label: "Hello World",
  tooltip: "Debug client example",
  icon: "./icon-16.png",
  url: "./panel.html",

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
        label: "My Button",
        tooltiptext: "This is a tooltip",
        command: this.onHello.bind(this)
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
  }
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
