/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");

const main = require("../main.js");

const { Cu } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { ToolbarButton } = require("./panel-toolbar.js");
const { Win } = require("../core/window.js");
const { EventTarget } = require("sdk/event/target");
const { prefs } = require("sdk/simple-prefs");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * This object implements 'Tools' popup menu available on the main toolbox
 * toolbar. This menu shows list of registered toolbox buttons.
 *
 * xxxHonza: better platform API could be provided.
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
      if (doc.getElementById("firebug-tools-menu")) {
        return;
      }

      let toolbar = doc.querySelector("toolbar.devtools-tabbar");
      let searchBox = doc.getElementById("fbSearchBox");
      let button = new ToolbarButton({
        id: "firebug-tools-menu",
        toolbar: toolbar,
        referenceElement: searchBox.nextSibling,
        type: "menu",
        label: "firebug.toolsMenu.label",
        tooltiptext: "firebug.toolsMenu.tip",
        items: this.getToolsMenuItems.bind(this)
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

    // Iterate list of registered toolbox buttons (tools).
    let tools = this.toolbox.toolboxButtons;
    for (let tool of tools) {
      let type = tool.button.type;

      // Display only tools that are available on the toolbox.
      // The user can change this settings in the Options panel.
      // xxxHonza: this is mainly because "command-button-frames"
      // doesn't update the list of frames if hidden.
      if (!Services.prefs.getBoolPref(tool.visibilityswitch)) {
        continue;
      }

      let item = {
        nol10n: true,
        label: tool.label,
        type: type ? type : "checkbox",
        autocheck: false,
        checked: tool.button.getAttribute("checked") == "true",
        tooltiptext: tool.button.tooltipText,
        command: this.onCommand.bind(this, tool)
      };

      // Special case for iframe switcher tool that is using sub-menu
      // for list of iframes in the current debugging target (page).
      // xxxHonza: improve platform API for extensions.
      if (tool.id == "command-button-frames") {
        item.items = this.onFrameItems.bind(this, tool);
      }

      items.push(item);
    }

    return items;
  },

  onFrameItems: function(tool) {
    let items = [];
    let menuPopup = this.toolbox.doc.getElementById("command-button-frames");

    // Iterate all existing menu items/frames in the list
    // and create corresponding menu items for the tool menu.
    let menuItems = menuPopup.querySelectorAll("menuitem");
    for (let menuItem of menuItems) {
      items.push({
        nol10n: true,
        type: "checkbox",
        label: menuItem.getAttribute("label"),
        "_data-window-id": menuItem.getAttribute("data-window-id"),
        "_data-parent-id": menuItem.getAttribute("data-parent-id"),
        checked: menuItem.getAttribute("checked"),
        command: this.onSelectFrame.bind(this)
      });
    }

    return items;
  },

  onSelectFrame: function(event) {
    Trace.sysout("toolsMenu.onSelectFrame;", event);

    // xxxHonza: is there a better way how to hide the popup
    // after executing a command?
    let button = event.view.document.getElementById("firebug-tools-menu");
    button.firstChild.hidePopup();

    this.toolbox.selectFrame(event);
  },

  onCommand: function(tool) {
    Trace.sysout("toolsMenu.onCommand;", tool);

    tool.button.click();
  }
});

// Exports from this module
exports.ToolsMenu = ToolsMenu;
