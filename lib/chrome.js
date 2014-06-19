/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./core/trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet } = require("sdk/stylesheet/utils");
const { ConsoleOverlay } = require("./console/consoleOverlay.js");
const { DebuggerOverlay } = require("./debugger/debuggerOverlay.js");
const { TabMenu } = require("./tabMenu.js");
const { defer } = require("sdk/core/promise");
const { SearchBox } = require("./searchBox.js");
const { TargetWatcher } = require("./targetWatcher.js");
const { Hooks } = require("./debug/transportHooks.js");

/**
 * This object represents a wrapper for native developer tools {@Toolbox}.
 * There is one instance of this object per browser window.
 */
const Chrome = Class({
/** @lends Chrome */
  extends: EventTarget,

  /**
   * The initialization happens when "toolbox-ready" event is fired
   * by gDevTools global. This is the place where Firebug UI initialization
   * steps should be performed.
   */
  initialize: function(toolbox) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("chrome.initialize;");

    this.toolbox = toolbox;
    this.watcher = new TargetWatcher(toolbox.target);

    // Apply Firebug theme styles.
    loadFirebugTheme(toolbox);

    // Register event handlers
    toolbox.on("select", this.onPanelSelected.bind(this));

    // Iterate list of specified overlays and apply them
    // on existing panels.
    var overlays = [
      {id: "webconsole", ctor: ConsoleOverlay},
      {id: "jsdebugger", ctor: DebuggerOverlay},
    ];

    for (let overlay of overlays)
      this.applyOverlay(toolbox, overlay);

    // Hook transport protocol (for tracing).
    let client = toolbox.target.client;
    client._transport.hooks = new Hooks(client);

    // TODO: It might be useful to fire an event here, so possible
    // listeners (or extension) might want to perform custom
    // initialization steps.
  },

  applyOverlay: function(toolbox, overlay) {
      // As soon as specified panel is ready create overlay
      // instance and initialize it.
      getPanelWhenReady(toolbox, overlay.id).then((panel) => {
        try {
          this.consoleOverlay = new overlay.ctor({
            toolbox: toolbox,
            panel: panel
          });
        }
        catch (err) {
          Trace.sysout("chrome.initialize; Overlay for: " + overlay.id +
            " EXCEPTION " + err, err);
        }
      });
  },

  destroy: function() {
    this.watcher.destroy();
  },

  // Event handlers
  onPanelSelected: function(eventId, panelId) {
    let panel = this.toolbox.getPanel(panelId);
    Trace.sysout("firebug.onPanelSelected; " + panelId, panel);

    TabMenu.initialize(this.toolbox, panelId);
  },
});

// Helper methods (private in this module, for now)

/**
 * Helper function, allows to get specified {@Toolbox} panel.
 * xxxHonza: might be part of some public utility object in the future.
 *
 * @param {@Toolbox} toolbox Reference to the toolbox instance
 * @param {@String} id ID of required panel
 *
 * @returns {@Promise} returns {@Promise} that is resolved when the
 *   panel is ready to use.
 */
function getPanelWhenReady(toolbox, id) {
  let deferred = defer();
  let panel = toolbox.getPanel(id);
  if (panel) {
    deferred.resolve(panel);
  } else {
    toolbox.once(id + "-ready", (eventId, panel) => {
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
