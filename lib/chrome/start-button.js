/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const main = require("../main.js");
const { Cu, Cc, Ci } = require("chrome");
const { defer } = require("sdk/core/promise");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { ToolbarButton } = require("firebug.sdk/lib/toolbar-button.js");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Dispatcher } = require("firebug.sdk/lib/dispatcher.js");
const { gDevTools, devtools } = require("firebug.sdk/lib/core/devtools.js");

// Firebug.next
const { Events } = require("../core/events.js");
const { Theme } = require("./theme.js");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { CustomizableUI } = Cu.import("resource:///modules/CustomizableUI.jsm", {});
const { AREA_PANEL, AREA_NAVBAR } = CustomizableUI;
const styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].
  getService(Ci.nsIStyleSheetService);

Cu.import("resource://gre/modules/Services.jsm");

// Constants
const HostType = devtools.Toolbox.HostType;
const startButtonId = "firebug-start-button";
const styleSheetUrl = "chrome://firebug/skin/start-button.css";

/**
 * This object represents 'Firebug Start button' that is available in
 * the main browser toolbar. There is one instance of this object in
 * Firefox session, but the XUL toolbarbutton itself is created for every
 * browser window (see onBuild method).
 *
 * The button is implemented as menu-button. Clicking on it opens/hides
 * the Toolbox. Clicking the drop-down arrow opens a popup menu with
 * basic Firebug commands.
 */
var StartButton =
/** @lends StartButton */
{
  // Initialization

  initialize: function() {
    // Create customizable button in browser toolbar.
    // Read more:
    // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/CustomizableUI.jsm
    // https://blog.mozilla.org/addons/2014/03/06/australis-for-add-on-developers-2/
    CustomizableUI.createWidget({
      id: startButtonId,
      type: "custom",
      defaultArea: AREA_NAVBAR,
      allowedAreas: [AREA_PANEL, AREA_NAVBAR],
      onBuild: this.onBuild.bind(this)
    });

    // Load Stylesheet
    this.styleUri = Services.io.newURI(styleSheetUrl, null, null);

    styleSheetService.loadAndRegisterSheet(this.styleUri,
      styleSheetService.AUTHOR_SHEET);

    this.onToolboxReady = this.onToolboxReady.bind(this);

    // Listen to toolbox creation event.
    gDevTools.on("toolbox-ready", this.onToolboxReady);
  },

  shutdown: function(reason) {
    styleSheetService.unregisterSheet(this.styleUri,
      styleSheetService.AUTHOR_SHEET);

    CustomizableUI.destroyWidget(startButtonId);

    gDevTools.off("toolbox-ready", this.onToolboxReady);
  },

  /**
   * An instance of the button (widget) is automatically build by the
   * platform for every browser window.
   *
   * @param {Document} Browser document the button is being built in.
   *
   * @returns {XULElement} The result XUL element reference (not appended
   * into the document yet).
   */
  onBuild: function(doc) {
    Trace.sysout("StartButton.onBuild;", doc);

    let button = new ToolbarButton({
      document: doc,
      id: startButtonId,
      label: "Firebug",
      tooltiptext: "Firebug",
      type: "menu-button",
      "class": "toolbarbutton-1 chromeclass-toolbar-additional",
      image: "chrome://firebug/skin/firebugSmall.svg",
      items: this.getMenuItems.bind(this, doc.defaultView),
      command: this.onToggleToolbox.bind(this)
    });

    return button.button;
  },

  // Toolbox Callbacks

  onToolboxReady: function(event, toolbox) {
    Trace.sysout("StartButton.onToolboxReady;", toolbox);

    let browserDoc = toolbox.doc.defaultView.top.document;
    let updateButton = this.updateButton.bind(this, browserDoc);

    // xxxHonza: remove listeners when Firebug is disabled?
    toolbox.target.on("visible", updateButton);
    toolbox.target.on("hidden", updateButton);
    toolbox.on("destroyed", updateButton);

    this.updateButton(browserDoc);
  },

  updateButton: function(browserDoc) {
    Trace.sysout("StartButton.updateButton;", browserDoc);

    let startButton = this.getButton(browserDoc);

    // Avoid exception at shutdown.
    if (!startButton) {
      return;
    }

    if (getToolbox(browserDoc.defaultView)) {
      startButton.setAttribute("active", "true");
    } else {
      startButton.removeAttribute("active");
    }
  },

  getButton: function(browserDoc) {
    return browserDoc.getElementById(startButtonId);
  },

  // Menu Actions

  getMenuItems: function(win) {
    let items = [];

    // xxxHonza: share the Location menu with chrome/firebugMenu
    items.push({
      nol10n: true,
      type: "menu",
      label: Locale.$STR("firebug.menu.Location"),
      tooltiptext: Locale.$STR("firebug.menu.tip.ShowErrorCount"),
      items: this.getLocationMenuItems.bind(this, win)
    });

    items.push("-");

    items.push({
      nol10n: true,
      type: "checkbox",
      checked: Theme.isFirebugActive(),
      label: Locale.$STR("firebug.menu.Theme"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Theme"),
      command: this.onFirebugTheme.bind(this)
    });

    items.push("-");

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.ClearConsole"),
      tooltiptext: Locale.$STR("firebug.menu.tip.ClearConsole"),
      command: this.onClearConsole.bind(this)
    });

    items.push("-");

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.About") + " " + self.version,
      tooltiptext: Locale.$STR("firebug.menu.tip.About"),
      command: this.onAbout.bind(this)
    });

    return items;
  },

  getLocationMenuItems: function(win) {
    Trace.sysout("StartButton.getLocationMenuItems;", win);

    let items = [];
    let hostType = Services.prefs.getCharPref("devtools.toolbox.host");

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Detached"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Detached"),
      command: this.onDetached.bind(this),
      type: "checkbox",
      checked: hostType == HostType.WINDOW
    });

    /*items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Top"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Top"),
    });*/

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Bottom"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Bottom"),
      command: this.onBottom.bind(this),
      type: "checkbox",
      checked: hostType == HostType.BOTTOM
    });

    /*items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Left"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Left"),
    });*/

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Right"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Right"),
      command: this.onRight.bind(this),
      type: "checkbox",
      checked: hostType == HostType.SIDE
    });

    return items;
  },

  onToggleToolbox: function(event) {
    Trace.sysout("StartButton.onToggleToolbox;");

    if (getToolbox(event.view)) {
      main.Firebug.destroyToolbox(event.view);
    } else {
      main.Firebug.showToolbox(event.view);
    }
  },

  onAbout: function(event) {
    main.Firebug.about();
    Events.cancelEvent(event);
  },

  onFirebugTheme: function(event) {
    Trace.sysout("StartButton.onFirebugTheme;");

    Events.cancelEvent(event);
    Theme.toggle();
  },

  onClearConsole: function(event) {
    Events.cancelEvent(event);

    let toolbox = getToolbox(event.view);
    let toolboxOverlay = this.chrome.getOverlay(toolbox,
      "FirebugToolboxOverlay");

    toolboxOverlay.getPanelWhenReady("webconsole").then(panel => {
      toolboxOverlay.getOverlay("webconsole").clearConsole();
    });
  },

  onShowErrorCount: function(event) {
    // xxxHonza: TBD
    Events.cancelEvent(event);
  },

  onClearActivationList: function(event) {
    // xxxHonza: TBD
    Events.cancelEvent(event);
  },

  // UI Location (host position)
  // xxxHonza: TESTME, what if the switchHost method name change?

  onDetached: function(event) {
    getToolboxWhenReady(event).then((toolbox) => {
      toolbox.switchHost(HostType.WINDOW);
    });

    hideStartMenu(event);
    Events.cancelEvent(event);
  },

  onRight: function(event) {
    getToolboxWhenReady(event).then((toolbox) => {
      toolbox.switchHost(HostType.SIDE);
    });

    hideStartMenu(event);
    Events.cancelEvent(event);
  },

  onBottom: function(event) {
    getToolboxWhenReady(event).then((toolbox) => {
      toolbox.switchHost(HostType.BOTTOM);
    });

    hideStartMenu(event);
    Events.cancelEvent(event);
  },
}

// Helpers

function getToolbox(win) {
  return main.Firebug.getToolbox(win);
}

function getToolboxWhenReady(event) {
  let view = event.view;
  let deferred = defer();
  let toolbox = main.Firebug.getToolbox(view);
  if (toolbox) {
    deferred.resolve(toolbox);
  }
  else {
    main.Firebug.showToolbox(view).then(toolbox => {
      deferred.resolve(toolbox);
    });
  }
  return deferred.promise;
}

function hideStartMenu(event) {
  let doc = event.view.document;
  let button = doc.getElementById(startButtonId);
  button.firstChild.hidePopup();
}

// Registration
Dispatcher.register(StartButton);

// Exports from this module
exports.StartButton = StartButton;
