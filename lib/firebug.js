/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { SearchBox } = require("./searchBox.js");
const { defer } = require("sdk/core/promise");
const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

// Extension modules
require("./helloWorldPanel.js");
require("./pageContextMenu.js");
require("./toolbarButton.js");
require("./windowWatcher.js");
require("./tabContext.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * This object represents the main Firebug application object. Firebug
 * object is a singleton and there is one instance shared across all
 * browser windows.
 */
const Firebug = Class({
  extends: EventTarget,

  /**
   * Firebug initialization.
   */
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("firebug.initialize; options: ", options);
  },

  /**
   * Executed by the framework when Firebug is destroyed
   * i.e. the entire extension is disabled, unloaded or
   * removed.
   */
  shutdown: function(reason) {
    Trace.sysout("firebug.shutdown; " + reason);
  },

  /**
   * Executed by the framework when {@Toolbox} is ready to use. There is
   * one instance of the {@Toolbox} per browser window.
   */ 
  onToolboxReady: function(event, toolbox) {
    Trace.sysout("firebug.onToolboxReady; ", toolbox);

    this.toolbox = toolbox;

    // Apply Firebug theme styles.
    loadFirebugTheme(toolbox);

    toolbox.on("select", this.onPanelSelected.bind(this));

    let target = toolbox.target;

    // xxxHonza: testing event handlers for the tabWatcher.
    target.on("will-navigate", () => {
      Trace.sysout("firebug.will-navigate;", arguments);
    });

    target.on("navigate", (eventId, event) => {
      Trace.sysout("firebug.navigate;", arguments);
    });

    target.on("visible", () => {
      Trace.sysout("firebug.visible;", arguments);
    });

    target.on("hidden", () => {
      Trace.sysout("firebug.hidden;", arguments);
    });
  },

  onToolboxDestroyed: function(target) {
    Trace.sysout("firebug.onToolboxDestroyed;", target);
  },

  onPanelSelected: function(eventId, panelId) {
    let panel = this.toolbox.getPanel(panelId);
    Trace.sysout("firebug.onPanelSelected; " + panelId, panel);

    createTabMenu(this.toolbox, panelId);
  },

  // Options
  updateOption: function() {
    Trace.sysout("firebug.updateOption; ", arguments);
  },

  // Registration methods
  registerPanel: function(panel) {
    // TODO: panel registration
  }
});

// Helper Methods
// xxxHonza: all the helper methods could compose a new object related
// to toolbox API

/**
 * Helper function, allows to get specified {@Toolbox} panel. The method
 * returns {@Promise} that is resolved when the panel is ready to use.
 *
 * @param {@Toolbox} toolbox Reference to the toolbox instance
 * @param {@String} id ID of required panel
 */
function getPanelWhenReady(toolbox, id) {
  let deferred = defer();
  let panel = toolbox.getPanel(id);
  if (panel) {
    deferred.resolve(panel);
  } else {
    toolbox.once(id + "-ready", panel => {
      deferred.resolve(panel);
    });
  }
  return deferred.promise;
}

/**
 * Load firebug theme stylesheets into the toolbox.
 *
 * @param {@Toolbox} toolbox Reference to the toolbox instance
 */
function loadFirebugTheme(toolbox) {
  let doc = toolbox.doc;
  let frame = toolbox.frame;

  // List of styles to load
  let styles = [
    "toolbox.css",
    "toolbars.css",
    "buttons.css",
    "splitter.css",
    "searchbox.css",
    "tabmenu.css",
  ];

  // Apply firebug theme styles to the toolbox
  let win = frame.contentWindow;
  for (var style of styles) {
    var url = self.data.url("firebug-theme/" + style);
    loadSheet(win, url, "author");
  }

  doc.documentElement.classList.add("theme-firebug");

  customizePanelTabs(toolbox);

  // Customize Search Box theme
  let tabBar = doc.querySelector(".devtools-tabbar");
  let searchBox = new SearchBox({
    parentNode: tabBar,
    reference: doc.querySelector("#toolbox-controls-separator")
  });

  // Console panel theme
  getPanelWhenReady(toolbox, "webconsole").then((panel) => {
    let doc = panel._frameWindow.frameElement.contentDocument;
    let win = doc.getElementById("devtools-webconsole");

    Trace.sysout("Web console ready " + win, win);

    win.classList.add("theme-firebug");
    win.classList.remove("theme-light");

    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/webconsole.css"), "author");
    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/toolbars.css"), "author");
  });
}

function customizePanelTabs(toolbox) {
  let panels = toolbox.getToolPanels();
  for (let id in panels) {
    Trace.sysout("id " + id)
    createTabMenu(toolbox, id);
  }

  let doc = toolbox.doc;
  let tabs = doc.querySelectorAll(".devtools-tab");
  for (let tab of tabs) {
    tab.removeAttribute("flex");
  }
}

function createTabMenu(toolbox, panelId) {
  let panelTabId = "toolbox-tab-" + panelId;
  let tab = toolbox.doc.getElementById(panelTabId);
  if (tab.tabMenu)
    return;

  // Create tab menu box.
  let doc = toolbox.doc;
  let tabMenu = doc.createElementNS(XUL_NS, "box");
  tabMenu.classList.add("panelTabMenu");

  // xxxHonza: why this doesn't work?
  tabMenu.addEventListener("mousedown", event => {
    Trace.sysout("click");
  }, true);

  // Create menu target.
  let menuTarget = doc.createElementNS(XUL_NS, "image");
  menuTarget.setAttribute("id", panelTabId + "-menu");
  menuTarget.classList.add("menuTarget");

  tabMenu.appendChild(menuTarget);
  tab.appendChild(tabMenu);

  tab.tabMenu = tabMenu;
}

// Exports from this module
exports.Firebug = Firebug;
