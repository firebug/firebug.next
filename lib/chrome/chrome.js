/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("../core/trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet } = require("sdk/stylesheet/utils");
const { TabMenu } = require("./tabMenu.js");
const { defer } = require("sdk/core/promise");
const { SearchBox } = require("./searchBox.js");
const { TargetWatcher } = require("./targetWatcher.js");
const { hook } = require("../debug/transportHooks.js");
const { Reps } = require("../reps/reps.js");
const { Events } = require("../core/events.js");

// Overlays
const { ConsoleOverlay } = require("../console/consoleOverlay.js");
const { DebuggerOverlay } = require("../debugger/debuggerOverlay.js");
const { OptionsOverlay } = require("../options/optionsOverlay.js");

/**
 * This object represents a wrapper for native developer tools {@Toolbox}.
 * There is one instance of this object per browser window.
 */
const Chrome = Class(
/** @lends Chrome */
{
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

    // Hook transport protocol (for tracing).
    hook(toolbox.target.client);

    // TODO: It might be useful to fire an event here, so possible
    // listeners (or extension) might want to perform custom
    // initialization steps.
  },

  destroy: function() {
    this.watcher.destroy();
  },

  // Selection
  select: function(object) {
    // xxxHonza: for now forward the click to the DOM panel.
    // Later we need to use BasePanel.supportsObject and get the target panel
    // dynamically according to the clicked object.
    var panelId = "dev-panel-firebug-nextjetpack-DOM";
    this.toolbox.selectTool(panelId).then((panel) => {
      panel.select(object);
    });
  },

  // Event handlers
  onPanelSelected: function(eventId, panelId) {
    let panel = this.toolbox.getPanel(panelId);
    Trace.sysout("chrome.onPanelSelected; " + panelId, panel);

    TabMenu.initialize(this.toolbox, panelId);
  },

  onPanelContentClick: function(event) {
    Trace.sysout("chrome.onPanelContentClick; ", event);

    // xxxHonza: unwrapping everywhere is not good idea.
    var target = XPCNativeWrapper.unwrap(event.target);
    var repNode = Reps.getRepNode(target);
    if (repNode) {
      var object = repNode.repObject;
      var rep = Reps.getRep(object);
      var realObject = rep ? rep.getRealObject(object) : null;
      var realRep = realObject ? Reps.getRep(realObject) : rep;
      if (!realObject)
        realObject = object;

      if (Events.isLeftClick(event)) {
        if (repNode.classList.contains("objectLink")) {
          if (realRep) {
            realRep.inspectObject(realObject, this);
            Events.cancelEvent(event);
          }
        }
      }
    }
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
    var url = "chrome://firebug/skin/" + style;
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
