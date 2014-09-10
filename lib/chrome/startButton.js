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
    let button = new ToolbarButton({
      document: doc,
      id: startButtonId,
      label: "Firebug",
      tooltiptext: "Firebug",
      type: "menu-button",
      "class": "toolbarbutton-1 chromeclass-toolbar-additional",
      image: "chrome://firebug/skin/firebugSmall.svg",
      items: this.getMenuItems(),
      command: this.onOpenToolbox.bind(this)
    });
    return button.button;
  },

  // Menu Actions

  getMenuItems: function() {
    var items = [];

    // xxxHonza: share the Location menu with chrome/firebugMenu
    items.push({
      nol10n: true,
      type: "menu",
      label: Locale.$STR("firebug.menu.Location"),
      tooltiptext: Locale.$STR("firebug.menu.tip.ShowErrorCount"),
      items: this.getLocationMenuItems()
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

  getLocationMenuItems: function() {
    var items = [];

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Detached"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Detached"),
    });

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Top"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Top"),
    });

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Bottom"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Bottom"),
    });

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Left"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Left"),
    });

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.Right"),
      tooltiptext: Locale.$STR("firebug.menu.tip.Right"),
    });

    return items;
  },

  onOpenToolbox: function(event) {
    main.Firebug.showToolbox(event.view);
  },

  // xxxHonza: share the About menu with chrome/firebugMenu
  onAbout: function() {
    main.Firebug.about();
  },

  onClearConsole: function(event) {
    let toolbox = main.Firebug.getToolbox(event.view);
    let chrome = main.Firebug.getChrome(toolbox);
    chrome.getOverlay("webconsole").clearConsole();
  },

  onShowErrorCount: function() {
    // xxxHonza: TBD
  },

  onClearActivationList: function() {
    // xxxHonza: TBD
  }
}

exports.StartButton = StartButton;
