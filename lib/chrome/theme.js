/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const main = require("../main.js");
const { Cu } = require("chrome");
const { loadSheet } = require("sdk/stylesheet/utils");
const { emit, on, off } = require("sdk/event/core");
const { windows, isDocumentLoaded } = require("sdk/window/utils");
const { prefs } = require("sdk/simple-prefs");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { Dom } = require("firebug.sdk/lib/core/dom.js");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Win } = require("firebug.sdk/lib/core/window.js");
const { Xul } = require("firebug.sdk/lib/core/xul.js");
const { Options } = require("firebug.sdk/lib/core/options.js");
const { System } = require("firebug.sdk/lib/core/system.js");
const { ToolbarButton } = require("firebug.sdk/lib/toolbar-button.js");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { gDevTools, devtools } = require("firebug.sdk/lib/core/devtools.js");
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
  let sharedStyles = [
    skinUrl + "firebug-style-variables.css",
    skinUrl + "variables.css",
    skinUrl + "common.css",
    skinUrl + "firebug-theme.css",
    skinUrl + "toolbox.css",
    skinUrl + "scrollbox.css",
    skinUrl + "toolbars.css",
    skinUrl + "buttons.css",
    skinUrl + "splitter.css",
    skinUrl + "searchbox.css",
    skinUrl + "tabmenu.css",
    skinUrl + "options.css",
    skinUrl + "codemirror-firebug.css",
    skinUrl + "panelbase.css",
    skinUrl + "toggle-sidepanels.css",
    skinUrl + "command-editor.css",
    skinUrl + "webconsole.css",
    skinUrl + "markup-view.css",
    skinUrl + "breadcrumbs.css"
  ];

  // List of OS dependent styles are added at the end, so they
  // can override the default (shared) styling.
  // xxxHonza: we might want to automate this. Automatically change
  // URL (add '-os') of every default (shared) stylesheet and append
  // if it exists.
  let osSkinUrl = "chrome://firebug-os/skin/";
  let osStyles = [
    osSkinUrl + "searchbox.css",
    osSkinUrl + "toolbars.css",
    osSkinUrl + "scrollbox.css",
    osSkinUrl + "webconsole.css",
    osSkinUrl + "breadcrumbs.css",
  ]

  // Register new developer tools theme.
  gDevTools.registerTheme({
    id: "firebug",
    label: Locale.$STR("options.label.firebugTheme"),
    stylesheets: sharedStyles.concat(osStyles),
    classList: ["theme-firebug"],
    onApply: this.onThemeApply.bind(this),
    onUnapply: this.onThemeUnapply.bind(this),
  });

  // Set Firebug theme as the default one if Firebug has been installed
  // or enabled. Downgrade and upgrade is also supported since these
  // changes cause Firebug theme deactivation (when uninstalling the
  // previous version). This way e.g. Firebug reinstallation doesn't
  // deactivate theme. There can be some corner cases where Firebug
  // theme is activated while user didn't want to, but in general,
  // if the user is installing Firebug there is good chance he/she wants
  // to see the Firebug theme.
  let reason = options.loadReason;
  if (reason == "install" || reason == "enable" ||
      reason == "upgrade" || reason == "downgrade") {
    // xxxHonza: iterate over all browser windows and tabs and reopen
    // all existing toolboxes in order to properly apply Firebug overlays.
    // TODO: panel overlays (and the toolbox customizations) should be
    // properly applied even on existing panels.
    let browsers = windows("navigator:browser", {includePrivate: true});
    browsers.forEach(browser => {
      let tabBrowser = browser.getBrowser();
      let numTabs = tabBrowser.browsers.length;
      for (let index=0; index<numTabs; index++) {
        reopenToolbox(tabBrowser.mTabs[index]);
      }
    });

    // Activate Firebug theme.
    this.setCurrentTheme("firebug", true);
  }
}

function reopenToolbox(tab) {
  let target = devtools.TargetFactory.forTab(tab);
  let toolbox = gDevTools.getToolbox(target);
  if (toolbox) {
    toolbox.destroy().then(() => {
      let target = devtools.TargetFactory.forTab(tab);
      gDevTools.showToolbox(target);
    });
  }
}

Theme.unregisterFirebugTheme = function(reason) {
  if (reason == "uninstall" || reason == "disable") {
    // Switch into the correct default theme if Firebug theme
    // is the current one.
    if (this.isFirebugActive()) {
      let defaultTheme = System.isDeveloperBrowser() ? "dark" : "light";
      Theme.setCurrentTheme(defaultTheme);
    }
  }

  // Unregister Firebug theme.
  gDevTools.unregisterTheme("firebug");
}

Theme.onThemeApply = function(win, oldTheme) {
  let documentElement = win.document.documentElement;
  let location = documentElement.ownerDocument.location;

  Trace.sysout("Theme.onThemeApply; " + location + ", " +
    documentElement.className, win);

  emit(this, "onThemeApply", win, oldTheme);
}

Theme.onThemeUnapply = function(win, newTheme) {
  let documentElement = win.document.documentElement;
  let location = documentElement.ownerDocument.location;

  Trace.sysout("Theme.onThemeUnapply; " + location + ", " +
    documentElement.className, win);

  emit(this, "onThemeUnapply", win, newTheme);
}

Theme.addThemeListeners = function(apply, unapply) {
  on(this, "onThemeApply", apply);
  on(this, "onThemeUnapply", unapply);
}

Theme.removeThemeListeners = function(apply, unapply) {
  off(this, "onThemeApply", apply);
  off(this, "onThemeUnapply", unapply);
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

  this.setCurrentTheme(newValue);
}

/**
 * Set a new devtools theme.
 *
 * @param newTheme {String} If of an existing theme.
 * @param force {Boolean} If true the theme switch logic will happen
 * even if the new theme is already active.
 */
Theme.setCurrentTheme = function(newTheme, force) {
  Trace.sysout("Theme.setCurrentTheme; " + newTheme + ", " + force);

  let oldTheme = this.getCurrentTheme();

  if (force) {
    if (oldTheme == newTheme) {
      oldTheme = null;
    }
  }

  if (oldTheme == newTheme) {
    return;
  }

  Services.prefs.setCharPref("devtools.theme", newTheme);

  let data = {
    pref: "devtools.theme",
    newValue: newTheme,
    oldValue: oldTheme
  };

  gDevTools.emit("pref-changed", data);
}

Theme.customizeSideBarSplitter = function(iframeWin, apply) {
  Win.loaded(iframeWin).then(doc => {
    if (apply) {
      // Create a little box in the splitter, so we can theme its top
      // part located between the main and side panel toolbar.
      // Note that the splitter element is available as soon as
      // the document is loaded.
      let splitters = doc.querySelectorAll("splitter.devtools-side-splitter");
      for (let splitter of splitters) {
        let box = splitter.querySelector(".panelSplitterBox");
        if (!box) {
          splitter.setAttribute("valign", "top");
          BOX({"class": "panelSplitterBox"}).build(splitter);
        }
      }
    } else {
      // Remove customization
      let splitters = doc.querySelectorAll("splitter.devtools-side-splitter");
      for (let splitter of splitters) {
        splitter.removeAttribute("valign");
        Dom.clearNode(splitter);
      }
    }
  });
}

// Exports from this module
exports.Theme = Theme;
