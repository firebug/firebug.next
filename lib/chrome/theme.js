/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { Locale } = require("../core/locale.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { TabMenu } = require("./tabMenu.js");
const { SearchBox } = require("./searchBox.js");
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
  let defaultUrl = "chrome://firebug/skin/";

  // List of styles to load. Note that Firebug them is based
  // on top of the light theme, so we need to also include
  // its stylesheet.
  let styles = [
    "chrome://browser/skin/devtools/light-theme.css",
    defaultUrl + "toolbox.css",
    defaultUrl + "toolbars.css",
    defaultUrl + "buttons.css",
    defaultUrl + "splitter.css",
    defaultUrl + "searchbox.css",
    defaultUrl + "tabmenu.css",
  ];

  // xxxHonza: new API, you need patch from:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1038562
  gDevTools.registerTheme({
    id: "firebug",
    label: Locale.$STR("options.label.firebugTheme"),
    ordinal: 3,
    stylesheets: styles,
    classList: ["theme-light", "theme-firebug"],
    onApply: function(win, oldTheme) {},
    onUnapply: function(win, newTheme) {}
  });
}

// Customize Search Box theme
// xxxHonza: probably belongs to the searchBox module
Theme.customizeSearch = function(toolbox) {
  let doc = toolbox.doc;
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
  return;

  // Handle theme changes
  gDevTools.on("pref-changed", (ev, data) => {
    if (data.pref === "devtools.theme")
      callback(data.newValue, data.oldValue);
  });

  // Initialization of the default theme.
  var defaultTheme = Services.prefs.getCharPref("devtools.theme");
  callback(defaultTheme, null);
}

// Handle theme changes
// xxxHonza: Missing platform API, see also:
// Bug 1038562 - New API: Implementation of a new theme
// (platform patch needs to be applied).
gDevTools.on("theme-switched", (type, win, newTheme, oldTheme) => {
  let documentElement = win.document.documentElement;
  let location = documentElement.ownerDocument.location;

  Trace.sysout("theme.theme-switched; for: " + location + ", " +
    documentElement.className, win);
});

// Exports from this module
exports.Theme = Theme;
