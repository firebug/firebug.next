/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true */

"use strict";

var main = require("../../main.js");

const { Ci, Cu, Cc } = require("chrome");
const { ToolbarButton } = require("../../chrome/panelToolbar.js");

/**
 * TODO: description
 */
var RemoteLoggingFilter =
/** @lends RemoteLoggingFilter */
{
  /**
   * Create/Remove an additional 'Server Logging' filter button that
   * is available when the Firebug theme is active.
   * The button can be used to filter messages coming from the server.
   */
  updateButton: function(consoleOverlay, apply) {
    let doc = consoleOverlay.getPanelDocument();
    let toolbar = doc.querySelector(
      ".hud-console-filter-toolbar > .devtools-toolbarbutton-group");

    // xxxHonza: localization
    if (apply) {
      let button = new ToolbarButton({
        id: "firebug-serverlog-filter",
        toolbar: toolbar,
        type: "menu-button",
        category: "server",
        class: "devtools-toolbarbutton webconsole-filter-button",
        label: "console.menu.label.serverLogFilter",
        tooltiptext: "console.menu.tip.serverLogFilter",
        items: [{
          id: "firebug-serverlog-filter-errors",
          label: "Errors",
          type: "checkbox",
          prefKey: "error",
          autocheck: false,
          tooltiptext: "Errors",
        }, {
          id: "firebug-serverlog-filter-warnings",
          label: "Warnings",
          type: "checkbox",
          prefKey: "warn",
          autocheck: false,
          tooltiptext: "Warnings",
        }, {
          id: "firebug-serverlog-filter-info",
          label: "Info",
          type: "checkbox",
          prefKey: "info",
          autocheck: false,
          tooltiptext: "Info",
        }, {
          id: "firebug-serverlog-filter-logs",
          label: "Logs",
          type: "checkbox",
          prefKey: "log",
          autocheck: false,
          tooltiptext: "Logs",
        }]
      });
    } else {
      let persistButton = doc.getElementById("firebug-serverlog-filter");
      if (persistButton)
        persistButton.remove();
    }
  },

  // Commands
};

// Exports from this module
exports.RemoteLoggingFilter = RemoteLoggingFilter;
