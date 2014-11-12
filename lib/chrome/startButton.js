/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { ToolbarButton } = require("./panelToolbar.js");
const { Locale } = require("../core/locale.js");
const { defer } = require("sdk/core/promise");
const { Dom } = require("../core/dom.js");
const { Events } = require("../core/events.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Theme } = require("./theme.js");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { CustomizableUI } = Cu.import("resource:///modules/CustomizableUI.jsm", {});
const { AREA_PANEL, AREA_NAVBAR } = CustomizableUI;

const HostType = devtools.Toolbox.HostType;
const startButtonId = "firebug-start-button";

/**
 * This object represents 'Firebug Start button' that is available in
 * the main browser toolbar. There is one instance of this object in
 * Firefox session, but the XUL toolbarbutton itself is created for every
 * browser window (see onBuild method).
 *
 * The button is implemented as menu-button. Clicking on it opens/hides
 * the Toolbox. Clicking the drop-down arrow opens a popup menu with
 * basic Firebug commands.
 *
 * xxxHonza: we might want to use 'view' type for the customizable widget.
 * xxxHonza: what about the default 'Wrench' developer tools menu, should
 * we somehow integrate with it? (can we get input from Shorelander?)
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

    this.onToolboxReady = this.onToolboxReady.bind(this);

    // Listen to toolbox creation event.
    // Note that we can't use 'toolbox-destroyed' handler to update
    // the start button, since there is no way to get the current
    // browser window from the target passed in.
    // So, the 'destroyContext' event fired by {@Chrome} object is
    // utilized instead (see onToolboxReady method).
    gDevTools.on("toolbox-ready", this.onToolboxReady);
  },

  shutdown: function(reason) {
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
    Trace.sysout("startButton.onBuild;", doc);

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

  onToolboxReady: function(event, toolbox) {
    Trace.sysout("startButton.onToolboxReady;", toolbox);

    // Register listeners for context events. These events are used
    // to track tab selection changes and also see when the
    // context/toolbox is destroyed.
    let chrome = main.Firebug.getChrome(toolbox);
    chrome.on("hideContext", this.updateButton.bind(this));
    chrome.on("showContext", this.updateButton.bind(this));
    chrome.on("destroyContext", this.updateButton.bind(this));

    // Don't forget to update the start button (a toolbox has
    // been just created).
    this.updateButton(chrome);
  },

  updateButton: function(context) {
    Trace.sysout("startButton.updateButton;", context);

    let doc = context.getBrowserDoc();
    let startButton = doc.getElementById(startButtonId);

    // Avoid exception at shutdown.
    if (!startButton) {
      return;
    }

    if (getToolbox(doc.defaultView)) {
      startButton.setAttribute("active", "true");
    } else {
      startButton.removeAttribute("active");
    }
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

    // xxxHonza: FIXME
    /*items.push({
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
    });*/

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
    Events.cancelEvent(event);
    Theme.toggle();
  },

  onClearConsole: function(event) {
    let chrome = getChrome(event);
    if (chrome) {
      chrome.getOverlay("webconsole").clearConsole();
    }

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

// Registration
main.target.on("initialize", StartButton.initialize.bind(StartButton));
main.target.on("shutdown", StartButton.shutdown.bind(StartButton));

// Exports from this module
exports.StartButton = StartButton;
