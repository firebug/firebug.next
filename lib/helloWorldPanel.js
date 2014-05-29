/* See license.txt for terms of usage */

"use strict";

// ********************************************************************************************* //
// Constants

var self = require("sdk/self");

const { BasePanel } = require("./basePanel");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("./trace.js");
const { Tool } = require("dev/toolbox");
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");

// ********************************************************************************************* //
// DevTools Panel

const HelloWorldPanel = Class({
  extends: BasePanel,

  label: "Hello World",
  tooltip: "Debug client example",
  icon: "./icon-16.png",
  url: "./panel.html",

  getPanelToolbarButtons: function()
  {
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

  getSubMenuItems: function()
  {
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

  // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
  // Options Menu

  getOptionsMenuItems: function()
  {
    return this.getMenuButtonItems();
  },

  // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
  // Context Menu

  getContextMenuItems: function()
  {
    return this.getMenuButtonItems();
  },

  onHello: function()
  {
    Trace.sysout("Hello World!");
  }
});

// ********************************************************************************************* //
// Registration

const helloWorldTool = new Tool({
  name: "Hello World Tool",
  panels: {
    helloWorld: HelloWorldPanel
  }
});

// ********************************************************************************************* //
// Exports

exports.HelloWorldPanel = HelloWorldPanel;

// ********************************************************************************************* //
