/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true */

"use strict";

var main = require("../../main.js");

const { Ci, Cu, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { ToolbarButton } = require("../../chrome/panelToolbar.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

// Filter preferences for server side logs
const prefs = [
  "servererror",
  "serverwarn",
  "serverinfo",
  "serverlog"
];

/**
 * TODO: description
 *
 * xxxHonza: needs refactoring, there should probably be one instance
 * for each {@ConsoleOverlay} instance.
 */
var RemoteLoggingFilter =
/** @lends RemoteLoggingFilter */
{
  init: function(consoleOverlay) {
    Trace.sysout("remoteLoggingFilter.init;");

    let frame = consoleOverlay.panel.hud.ui;

    for (let pref of prefs) {
      let prefName = frame._filterPrefsPrefix + pref;
      let value;

      // xxxHonza: is there a better way how to set default
      // values to preferences coming from different branch?
      try {
        value = Services.prefs.getBoolPref(prefName);
      } catch (err) {
        // Default value is true
        value = true
        Services.prefs.setBoolPref(prefName, value);
      }

      FBTrace.sysout("prefName " + prefName, frame.filterPrefs[pref]);

      frame.filterPrefs[pref] = value;
    }

    let doc = consoleOverlay.getPanelDocument();
    let button = doc.getElementById("firebug-serverlog-filter");

    button.addEventListener("click", frame._toggleFilter, false);

    let someChecked = false;
    let severities = button.querySelectorAll("menuitem[prefKey]");
    Array.forEach(severities, function(menuItem) {
      menuItem.addEventListener("command", frame._toggleFilter, false);

      let prefKey = menuItem.getAttribute("prefKey");
      let checked = frame.filterPrefs[prefKey];
      menuItem.setAttribute("checked", checked);
      someChecked = someChecked || checked;
    }, this);

    button.setAttribute("checked", someChecked);
    button.setAttribute("aria-pressed", someChecked);
  },

  /**
   * Create/Remove an additional 'Server Logging' filter button that
   * is available when the Firebug theme is active.
   * The button can be used to filter messages coming from the server.
   */
  update: function(consoleOverlay, apply) {
    Trace.sysout("remoteLoggingFilter.updateButton;");

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
          _prefKey: "servererror",
          autocheck: false,
          tooltiptext: "Errors",
        }, {
          id: "firebug-serverlog-filter-warnings",
          label: "Warnings",
          type: "checkbox",
          _prefKey: "serverwarn",
          autocheck: false,
          tooltiptext: "Warnings",
        }, {
          id: "firebug-serverlog-filter-info",
          label: "Info",
          type: "checkbox",
          _prefKey: "serverinfo",
          autocheck: false,
          tooltiptext: "Info",
        }, {
          id: "firebug-serverlog-filter-logs",
          label: "Logs",
          type: "checkbox",
          _prefKey: "serverlog",
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
