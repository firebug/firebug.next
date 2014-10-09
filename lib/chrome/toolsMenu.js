/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { ToolbarButton } = require("./panelToolbar.js");
const { Win } = require("../core/window.js");
const { EventTarget } = require("sdk/event/target");
const { Locale } = require("../core/locale.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * TODO: description
 */
const ToolsMenu = Class(
/** @lends ToolsMenu */
{
  extends: EventTarget,

  // Initialization

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    this.toolbox = options.chrome.toolbox;
  },

  destroy: function() {
  },

  // Theme

  onApplyTheme: function(win, oldTheme) {
    Win.loaded(win).then(doc => {
      if (doc.getElementById("firebug-tools-menu"))
        return;

      let toolbar = doc.querySelector("toolbar.devtools-tabbar");
      let searchBox = doc.getElementById("fbSearchBox");
      let button = new ToolbarButton({
        id: "firebug-tools-menu",
        toolbar: toolbar,
        referenceElement: searchBox.nextSibling,
        type: "menu",
        label: "firebug.toolsMenu.label",
        tooltiptext: "firebug.toolsMenu.tip",
        items: this.getToolsMenuItems()
      });

      this.button = button.button;
    });
  },

  onUnapplyTheme: function(win, newTheme) {
    Win.loaded(win).then(doc => {
      if (this.button) {
        this.button.remove();
        this.button = null;
      }
    })
  },

  getToolsMenuItems: function() {
    let items = [];

    let tools = this.toolbox.toolboxButtons;
    for (let tool of tools) {
      items.push({
        nol10n: true,
        label: tool.label,
        type: "checkbox",
        autocheck: false,
        checked: tool.button.getAttribute("checked") == "true",
        tooltiptext: tool.button.tooltipText,
        command: this.onCommand.bind(this, tool)
      });
    }

    return items;
  },

  onCommand: function(tool) {
    Trace.sysout("toolsMenu.onCommand;", tool);

    tool.button.click();
  }
});

// Exports from this module
exports.ToolsMenu = ToolsMenu;
