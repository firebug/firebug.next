/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");
var main = require("../main.js");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { CustomizableUI } = Cu.import("resource:///modules/CustomizableUI.jsm", {});
const { AREA_PANEL, AREA_NAVBAR } = CustomizableUI;
const { ToolbarButton } = require("./panelToolbar.js");
const { Locale } = require("../core/locale.js");
const { defer } = require("sdk/core/promise");
const { Dom } = require("../core/dom.js");
const { Events } = require("../core/events.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const HostType = devtools.Toolbox.HostType;
const startButtonId = "firebug-start-button";

/**
 * This object represents 'Firebug Start button' that is available in
 * the main browser toolbar. The button is implemented as menu-button.
 * Clicking the button opens/hides the Toolbox.
 * Clicking the drop-down arrow opens a menu with basic Firebug actions.
 *
 * xxxHonza: we might want to use 'view' type for the customizable widget.
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
      onBuild: this.build.bind(this)
    });
  },

  shutdown: function() {
    CustomizableUI.destroyWidget(startButtonId);
  },

  build: function(doc) {
    Trace.sysout("startButton.build;", doc);

    let button = new ToolbarButton({
      document: doc,
      id: startButtonId,
      label: "Firebug",
      tooltiptext: "Firebug",
      type: "menu-button",
      "class": "toolbarbutton-1 chromeclass-toolbar-additional",
      image: "chrome://firebug/skin/firebugSmall.svg",
      items: this.getMenuItems(doc.defaultView),
      command: this.onToggleToolbox.bind(this)
    });

    return button.button;
  },

  // Toolbox Callbacks

  onToolboxReady: function(toolbox) {
    Trace.sysout("startButton.onToolboxReady;", toolbox);

    let browserDoc = toolbox.doc.defaultView.top.document;
    let startButton = browserDoc.getElementById(startButtonId);

    // Update Firebug start menu icon
    // xxxHonza: TODO
    //startButton.setAttribute("active", "true");
  },

  onToolboxDestroyed: function(target) {
    Trace.sysout("startButton.onToolboxDestroyed;", target);

    // xxxHonza: How to get the browser from the target? FIX ME
    let browser = getMostRecentBrowserWindow();
    let browserDoc = browser.document;
    let startButton = browserDoc.getElementById(startButtonId);

    // Update Firebug start menu icon
    // xxxHonza: TODO
    //startButton.removeAttribute("active");
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
      label: Locale.$STR("firebug.menu.ClearConsole"),
      tooltiptext: Locale.$STR("firebug.menu.tip.ClearConsole"),
      command: this.onClearConsole.bind(this)
    });

    items.push("-");

    items.push({
      nol10n: true,
      tooltiptext: Locale.$STR("firebug.menu.tip.ShowErrorCount"),
      label: Locale.$STR("firebug.menu.ShowErrorCount"),
      command: this.onShowErrorCount.bind(this)
    });

    items.push({
      nol10n: true,
      tooltiptext: Locale.$STR("firebug.menu.tip.ClearActivationList"),
      label: Locale.$STR("firebug.menu.ClearActivationList"),
      command: this.onClearActivationList.bind(this)
    });

    items.push("-");

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.About") + " " + self.version,
      command: this.onAbout.bind(this)
    });

    return items;
  },

  getLocationMenuItems: function(win) {
    Trace.sysout("startButton.getLocationMenuItems;", win);

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
    Trace.sysout("startButton.onToggleToolbox;");

    if (getToolbox(event.view))
      main.Firebug.destroyToolbox(event.view);
    else
      main.Firebug.showToolbox(event.view);
  },

  onAbout: function() {
    main.Firebug.about();
    Events.cancelEvent(event);
  },

  onClearConsole: function(event) {
    let chrome = getChrome(event);
    if (chrome)
      chrome.getOverlay("webconsole").clearConsole();

    Events.cancelEvent(event);
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
  // xxxHonza: TEST ME, what if the switchHost method name change?

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

function getChrome(event) {
  let toolbox = getToolbox(event.view);
  return main.Firebug.getChrome(toolbox);
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

exports.StartButton = StartButton;
