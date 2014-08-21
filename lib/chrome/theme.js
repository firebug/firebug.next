/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Locale } = require("../core/locale.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { TabMenu } = require("./tabMenu.js");
const { emit, on } = require("sdk/event/core");
const { Win } = require("../core/window.js");
const { Xul } = require("../core/xul.js");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const StylesheetUtils = devtools["require"]("sdk/stylesheet/utils");

Cu.import("resource://gre/modules/Services.jsm");

// XUL Builder
const { BOX } = Xul;

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
    skinUrl + "panelbase.css",
  ];

  // Register new developer tools theme.
  gDevTools.registerTheme({
    id: "firebug",
    label: Locale.$STR("options.label.firebugTheme"),
    stylesheets: styles,
    classList: ["theme-light", "theme-firebug"],
    onApply: this.onThemeApply.bind(this),
    onUnapply: this.onThemeUnapply.bind(this),
  });
}

Theme.unregisterFirebugTheme = function() {
  // Unregister Firebug theme.
  gDevTools.unregisterTheme("firebug");
}

Theme.onThemeApply = function(win, oldTheme) {
  let documentElement = win.document.documentElement;
  let location = documentElement.ownerDocument.location;

  Trace.sysout("theme.onThemeApply; " + location + ", " +
    documentElement.className, win);

  emit(this, "onThemeApply", win, oldTheme);
}

Theme.onThemeUnapply = function(win, newTheme) {
  let documentElement = win.document.documentElement;
  let location = documentElement.ownerDocument.location;

  Trace.sysout("theme.onThemeUnapply; " + location + ", " +
    documentElement.className, win);

  emit(this, "onThemeUnapply", win, newTheme);
}

Theme.addThemeListeners = function(apply, unapply) {
  on(this, "onThemeApply", apply);
  on(this, "onThemeUnapply", unapply);
}

Theme.getCurrentTheme = function() {
  return Services.prefs.getCharPref("devtools.theme");
}

Theme.isFirebugActive = function() {
  return Theme.getCurrentTheme() == "firebug";
}

Theme.customizeSideBarSplitter = function(iframeWin, apply) {
  if (apply) {
    // Create a little box in the splitter, so we can theme its top
    // part located between the main and side panel toolbars.
    // Note that the splitter element is available as soon as
    // the document is loaded.
    Win.loaded(iframeWin).then(doc => {
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.setAttribute("valign", "top");
      BOX({"class": "panelSplitterBox"}).build(splitter);
    });
  }
  else {
    // Remove customization
    Win.loaded(iframeWin).then(doc => {
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.removeAttribute("valign");
      splitter.textContent = "";
    });
  }
}

// Exports from this module
exports.Theme = Theme;
