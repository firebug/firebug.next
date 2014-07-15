/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { TabMenu } = require("./tabMenu.js");
const { SearchBox } = require("./searchBox.js");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

Cu.import("resource://gre/modules/Services.jsm");

const Theme = {};

/**
* Load firebug theme stylesheets into the toolbox.
*
* @param {@Toolbox} toolbox Reference to the toolbox instance
*/
Theme.loadFirebugTheme = function(toolbox) {
  let doc = toolbox.doc;
  let frame = toolbox.frame;

  // List of styles to load
  let styles = [
    "toolbox.css",
    "toolbars.css",
    "buttons.css",
    "splitter.css",
    "searchbox.css",
    "tabmenu.css",
  ];

  // Apply firebug theme styles to the toolbox
  let win = frame.contentWindow;
  for (var style of styles) {
    var url = self.data.url("chrome://firebug/skin/" + style);
    loadSheet(win, url, "author");
  }

  doc.documentElement.classList.add("theme-firebug");

  this.customizePanelTabs(toolbox);

  // Customize Search Box theme
  // xxxHonza: probably belongs to the searchBox module
  let tabBar = doc.querySelector(".devtools-tabbar");
  let searchBox = new SearchBox({
    parentNode: tabBar,
    reference: doc.querySelector("#toolbox-controls-separator")
  });
}

Theme.customizePanelTabs = function(toolbox) {
  let panels = toolbox.getToolPanels();
  for (let id in panels)
    TabMenu.initialize(toolbox, id);

  let doc = toolbox.doc;
  let tabs = doc.querySelectorAll(".devtools-tab");
  for (let tab of tabs)
    tab.removeAttribute("flex");
}

/**
 * Helper for registering theme changes listener.
 */
Theme.addThemeListener = function(callback) {
  // Handle theme changes
  gDevTools.on("pref-changed", (ev, data) => {
    if (data.pref === "devtools.theme")
      callback(data.newValue, data.oldValue);
  });

  // Initialization of the default theme.
  var defaultTheme = Services.prefs.getCharPref("devtools.theme");
  callback(defaultTheme, null);
}

// Exports from this module
exports.Theme = Theme;

