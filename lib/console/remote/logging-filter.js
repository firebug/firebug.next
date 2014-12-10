/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true */

"use strict";

var main = require("../../main.js");

const { Ci, Cu, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { ToolbarButton } = require("../../chrome/panelToolbar.js");
const { Class } = require("sdk/core/heritage");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

// Filter preferences for server side logs
const prefs = [
  "servererror",
  "serverwarn",
  "serverinfo",
  "serverlog"
];

/**
 * This object represents a filter button available on the Console
 * panel toolbar. It's intended to filter logs coming from HTTP
 * server. These logs are sent over HTTP headers and parsed by
 * {@LoggerActor} actor. The actor is responsible for hooking
 * HTTP responses and detecting possible logs in the headers.
 *
 * xxxHonza: test all server filters TESTME
 */
var RemoteLoggingFilter = Class(
/** @lends RemoteLoggingFilter */
{
  initialize: function(consoleOverlay) {
    Trace.sysout("remoteLoggingFilter.initialize;", arguments);

    this.consoleOverlay = consoleOverlay;
    this.toggleFilter = this.toggleFilter.bind(this);

    let frame = getFrame(this.consoleOverlay);

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

      frame.filterPrefs[pref] = value;
    }
  },

  /**
   * Create/Remove an additional 'Server Logging' filter button that
   * is available when the Firebug theme is active.
   * The button can be used to filter messages coming from the server.
   */
  update: function(apply) {
    Trace.sysout("remoteLoggingFilter.update;", arguments);

    let frame = getFrame(this.consoleOverlay);
    let doc = this.consoleOverlay.getPanelDocument();
    let toolbar = doc.querySelector(
      ".hud-console-filter-toolbar > .devtools-toolbarbutton-group");

    // Set the tab index to be the next one after the last existing filter.
    let lastFilter = toolbar.lastChild;
    let tabIndex = parseInt(lastFilter.getAttribute("tabindex"), 10) + 1;

    // Create new toolbar button with sub-menu options (individual filters).
    // The button is removed when Firebug theme is deactivated.
    if (apply) {
      let toolbarButton = new ToolbarButton({
        id: "firebug-serverlog-filter",
        toolbar: toolbar,
        type: "menu-button",
        _category: "server",
        _tabindex: tabIndex,
        class: "devtools-toolbarbutton webconsole-filter-button",
        label: "console.menu.label.serverLogFilter",
        tooltiptext: "console.menu.tip.serverLogFilter",
        items: [{
          id: "firebug-serverlog-filter-errors",
          label: "console.filter.label.Errors",
          tooltiptext: "console.filter.tip.Errors",
          type: "checkbox",
          _prefKey: "servererror",
          autocheck: false,
        }, {
          id: "firebug-serverlog-filter-warnings",
          label: "console.filter.label.Warnings",
          tooltiptext: "console.filter.tip.Warnings",
          type: "checkbox",
          _prefKey: "serverwarn",
          autocheck: false,
        }, {
          id: "firebug-serverlog-filter-info",
          label: "console.filter.label.Info",
          tooltiptext: "console.filter.tip.Info",
          type: "checkbox",
          _prefKey: "serverinfo",
          autocheck: false,
        }, {
          id: "firebug-serverlog-filter-logs",
          label: "console.filter.label.Logs",
          tooltiptext: "console.filter.tip.Logs",
          type: "checkbox",
          _prefKey: "serverlog",
          autocheck: false,
        }]
      });

      let button = toolbarButton.button;
      button.addEventListener("click", this.toggleFilter, false);

      let someChecked = false;
      let severities = button.querySelectorAll("menuitem[prefKey]");
      Array.forEach(severities, function(menuItem) {
        menuItem.addEventListener("command", this.toggleFilter, false);

        let prefKey = menuItem.getAttribute("prefKey");
        let checked = frame.filterPrefs[prefKey];
        menuItem.setAttribute("checked", checked);
        someChecked = someChecked || checked;
      }, this);

      button.setAttribute("checked", someChecked);
      button.setAttribute("aria-pressed", someChecked);
    } else {
      let button = doc.getElementById("firebug-serverlog-filter");
      if (button) {
        button.remove();
      }
    }
  },

  toggleFilter: function(event) {
    Trace.sysout("remoteLoggingFilter.toggleFilter;", arguments);

    let frame = getFrame(this.consoleOverlay);
    frame._toggleFilter(event);
  },

  /**
   * Workaround to fix issue #124.
   * When a page is reloaded and the "Server" filter is unchecked,
   * the logs still appear. Calling this function adjust the visibility
   * according to the preference.
   */
  applyFilters: function() {
    let frame = getFrame(this.consoleOverlay);
    for (let pref of prefs) {
      let prefName = frame._filterPrefsPrefix + pref;
      let value = Options.getPref(prefName);
      frame.setFilterState(pref, value);
    }
  },
});

// Helpers
function getFrame(consoleOverlay) {
  return consoleOverlay.panel.hud.ui;
}

// Exports from this module
exports.RemoteLoggingFilter = RemoteLoggingFilter;
