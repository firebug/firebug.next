/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { Locale } = require("../core/locale.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { TabMenu } = require("./tabMenu.js");
const { SearchBox } = require("./searchBox.js");
const { emit, on } = require("sdk/event/core");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const StylesheetUtils = devtools["require"]("sdk/stylesheet/utils");

Cu.import("resource://gre/modules/Services.jsm");

const Theme = {};

/**
* Load firebug theme stylesheets into the toolbox.
*
* @param {@Toolbox} toolbox Reference to the toolbox instance
*/
Theme.registerFirebugTheme = function() {
  let skinUrl = "chrome://firebug/skin/";

  // List of styles to load. Note that Firebug them is based on the
  // light theme, so we need to also include light-theme stylesheet.
  let styles = [
    "chrome://browser/skin/devtools/light-theme.css",
    skinUrl + "toolbox.css",
    skinUrl + "toolbars.css",
    skinUrl + "buttons.css",
    skinUrl + "splitter.css",
    skinUrl + "searchbox.css",
    skinUrl + "tabmenu.css",
    skinUrl + "options.css",
    skinUrl + "codemirror-firebug.css",
  ];

  // Register new developer tools theme.
  gDevTools.registerTheme({
    id: "firebug",
    label: Locale.$STR("options.label.firebugTheme"),
    ordinal: 3,
    stylesheets: styles,
    classList: ["theme-light", "theme-firebug"],
    onApply: this.onThemeApply.bind(this),
  });
}

Theme.onThemeApply = function(win, oldTheme) {
  let documentElement = win.document.documentElement;
  let location = documentElement.ownerDocument.location;

  Trace.sysout("theme.onThemeApply; " + location + ", " +
    documentElement.className, win);

  emit(this, "onThemeApply", win, oldTheme);
}

Theme.addThemeListener = function(listener) {
  on(this, "onThemeApply", listener);
}

// Customize Search Box theme
// xxxHonza: belongs to the searchBox module
Theme.customizeSearch = function(toolbox) {
  let doc = toolbox.doc;
  let tabBar = doc.querySelector(".devtools-tabbar");
  let searchBox = new SearchBox({
    parentNode: tabBar,
    reference: doc.querySelector("#toolbox-controls-separator")
  });
}

// xxxHonza: should be part of theme load/unload
Theme.customizePanelTabs = function(toolbox) {
  let panels = toolbox.getToolPanels();
  for (let id in panels)
    TabMenu.initialize(toolbox, id);

  let doc = toolbox.doc;
  let tabs = doc.querySelectorAll(".devtools-tab");
  for (let tab of tabs)
    tab.removeAttribute("flex");
}

// Exports from this module
exports.Theme = Theme;
