/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Locale } = require("../core/locale.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { emit, on } = require("sdk/event/core");
const { Win } = require("../core/window.js");
const { Xul } = require("../core/xul.js");
const { Dom } = require("../core/dom.js");
const { ToolbarButton } = require("../chrome/panelToolbar.js");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const StylesheetUtils = devtools["require"]("sdk/stylesheet/utils");

// XUL Builder
const { BOX } = Xul;

const Theme = {};

/**
* Load firebug theme stylesheets into the toolbox.
*
* @param {@Toolbox} toolbox Reference to the toolbox instance
*/
Theme.registerFirebugTheme = function(options) {
  let skinUrl = "chrome://firebug/skin/";

  // List of styles to load.
  let styles = [
    skinUrl + "common.css",
    skinUrl + "firebug-theme.css",
    skinUrl + "toolbox.css",
    skinUrl + "toolbars.css",
    skinUrl + "buttons.css",
    skinUrl + "splitter.css",
    skinUrl + "searchbox.css",
    skinUrl + "tabmenu.css",
    skinUrl + "options.css",
    skinUrl + "codemirror-firebug.css",
    skinUrl + "panelbase.css",
    skinUrl + "toggle-sidepanels.css",
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

  // Set Firebug theme as the default one if Firebug
  // has been just installed.
  let reason = options.loadReason;
  if (reason == "install" || reason == "enable") {
    Services.prefs.setCharPref("devtools.theme", "firebug");
  }
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

Theme.toggle = function() {
  let oldValue = this.getCurrentTheme();
  let newValue = this.isFirebugActive() ? "light" : "firebug";

  Services.prefs.setCharPref("devtools.theme", newValue);

  let data = {
    pref: "devtools.theme",
    newValue: newValue,
    oldValue: oldValue
  };

  gDevTools.emit("pref-changed", data);
}

Theme.customizeSideBarSplitter = function(iframeWin, apply) {
  Win.loaded(iframeWin).then(doc => {
    if (apply) {
      // Create a little box in the splitter, so we can theme its top
      // part located between the main and side panel toolbars.
      // Note that the splitter element is available as soon as
      // the document is loaded.
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.setAttribute("valign", "top");
      BOX({"class": "panelSplitterBox"}).build(splitter);
    }
    else {
      // Remove customization
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.removeAttribute("valign");
      Dom.clearNode(splitter);
    }
  });
}

Theme.sideBarButton = function(panel, toolbar, apply) {
  let win = panel.getPanelWindow();
  if (apply) {
    let box = BOX({"class": "fbToggleSidePanelsBox"}).build(toolbar);
    let toggleButton = new ToolbarButton({
      toolbar: box,
      nol10n: true,
      id: "fbToggleSidePanels",
      tooltiptext: "Toggle Side Panels",
      className: "fbToggleSidePanels",
      command: () => panel.toggleSidebar(),
    });
  }
  else {
    // xxxHonza: TODO
  }
}

// Exports from this module
exports.Theme = Theme;
