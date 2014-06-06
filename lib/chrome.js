/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet } = require("sdk/stylesheet/utils");
const { ConsoleOverlay } = require("./consoleOverlay.js");
const { TabMenu } = require("./tabMenu.js");
const { defer } = require("sdk/core/promise");
const { SearchBox } = require("./searchBox.js");

/**
 * This object represents a wrapper for native developer tools {@Toolbox}.
 */
const Chrome = Class({
  extends: EventTarget,

  // Initialization
  initialize: function(toolbox) {
    EventTarget.prototype.initialize.call(this);

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

    // Console panel initialization
    // xxxHonza: this must be generic, so there might be overlays
    // for every built-in panels.
    getPanelWhenReady(toolbox, "webconsole").then((panel) => {
      try
      {
        this.consoleOverlay = new ConsoleOverlay({
          toolbox:toolbox, panel:panel});
      }
      catch (err)
      {
        Trace.sysout("firebug.webconsole-ready; EXCEPTION " + err, err);
      }
    });
  },

  onPanelSelected: function(eventId, panelId) {
    let panel = this.toolbox.getPanel(panelId);
    Trace.sysout("firebug.onPanelSelected; " + panelId, panel);

    TabMenu.initialize(this.toolbox, panelId);
  },

});

// Helper Methods
// xxxHonza: all the helper methods should be part of Chrome object
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
}

function customizePanelTabs(toolbox) {
  let panels = toolbox.getToolPanels();
  for (let id in panels) {
    Trace.sysout("id " + id)
    TabMenu.initialize(toolbox, id);
  }

  let doc = toolbox.doc;
  let tabs = doc.querySelectorAll(".devtools-tab");
  for (let tab of tabs) {
    tab.removeAttribute("flex");
  }
}

// Exports from this module
exports.Chrome = Chrome;
