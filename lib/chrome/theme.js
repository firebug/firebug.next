/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Locale } = require("../core/locale.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { emit, on, off } = require("sdk/event/core");
const { Win } = require("../core/window.js");
const { Xul } = require("../core/xul.js");
const { Dom } = require("../core/dom.js");
const { Options } = require("../core/options.js");
const { System } = require("../core/system.js");
const { ToolbarButton } = require("../chrome/panelToolbar.js");
const { windows, isDocumentLoaded } = require("sdk/window/utils");
const { prefs } = require("sdk/simple-prefs");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

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
  let sharedStyles = [
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
    classList: ["theme-light", "theme-firebug"],
    onApply: this.onThemeApply.bind(this),
    onUnapply: this.onThemeUnapply.bind(this),
  });

  this.onPrefChanged = this.onPrefChanged.bind(this);
  gDevTools.on("pref-changed", this.onPrefChanged);

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

  // Make sure the browser theme is also updated.
  Theme.updateBrowserTheme();
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

// Preferences changes callback
Theme.onPrefChanged = function(event, data) {
  if (data.pref != "devtools.theme") {
    return;
  }

  this.updateBrowserTheme();
},

Theme.updateBrowserTheme = function() {
  // Synchronize Developer Edition browser theme if it's enabled.
  // If Firebug toolbox theme is applied browser theme must be switched
  // to the default Australis.
  // The user can manually switch off the usage of dev-browser theme in
  // Customize screen by using "Use Firefox Developer Edition Theme"
  // button (available by default in Firefox Developer Edition).
  let themeEnabled = isDevEditionThemeOn();
  if (themeEnabled && Theme.isFirebugActive()) {
    let browser = getMostRecentBrowserWindow();
    let documentElement = browser.document.documentElement;
    documentElement.setAttribute("devtoolstheme", "firebug");
    browser.DevEdition._toggleStyleSheet(false);
  }
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
      // part located between the main and side panel toolbars.
      // Note that the splitter element is available as soon as
      // the document is loaded.
      if (!doc.querySelector(".devtools-side-splitter > .panelSplitterBox")) {
        let splitter = doc.querySelector(".devtools-side-splitter");
        splitter.setAttribute("valign", "top");
        BOX({"class": "panelSplitterBox"}).build(splitter);
      }
    }
    else {
      // Remove customization
      let splitter = doc.querySelector(".devtools-side-splitter");
      splitter.removeAttribute("valign");
      Dom.clearNode(splitter);
    }
  });
}

// Helpers

// Comes from toolbox-options.js
// xxxHonza: TESTME the return value should correspond to the
// checkbox in Customize screen.
function isDevEditionThemeOn() {
  let win = getMostRecentBrowserWindow("navigator:browser");
  return !!(win && win.DevEdition.styleSheet);
}

// Exports from this module
exports.Theme = Theme;
