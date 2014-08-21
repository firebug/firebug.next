/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet } = require("sdk/stylesheet/utils");
const { TabMenu } = require("./tabMenu.js");
const { defer } = require("sdk/core/promise");
const { SearchBox } = require("./searchBox.js");
const { TargetWatcher } = require("./targetWatcher.js");
const { TransportHooks } = require("../debug/transportHooks.js");
const { Reps } = require("../reps/reps.js");
const { Events } = require("../core/events.js");
const { Theme } = require("./theme.js");
const { customizeSearchBox } = require("./searchBox.js");

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

    this.tabMenus = new Map();
    this.toolbox = toolbox;
    this.watcher = new TargetWatcher(toolbox.target);

    // Register event handlers
    this.onPanelSelected = this.onPanelSelected.bind(this);
    toolbox.on("select", this.onPanelSelected);

    // Hook transport protocol (for tracing).
    this.hooks = new TransportHooks(toolbox.target.client);
    this.hooks.hook();

    // Register Firebug theme listeners for toolbox customizations.
    let apply = this.onApplyTheme.bind(this);
    let unapply = this.onUnapplyTheme.bind(this);
    Theme.addThemeListeners(apply, unapply);

    // Execute theme callback for toolbox.xul since it's been already
    // fired and we need to make sure the toolbox itself is also styled.
    if (Theme.isFirebugActive()) {
      this.onApplyTheme(this.toolbox.frame.contentWindow);
    }

    // The 'select' event isn't fired when the first panel is selected
    // by default, so do it now.
    this.onPanelSelected("select", toolbox._defaultToolId);

    // TODO: It might be useful to fire an event here, so possible
    // listeners (or extension) might want to perform custom
    // initialization steps.
  },

  destroy: function() {
    this.toolbox.off("select", this.onPanelSelected);

    this.watcher.destroy();

    this.hooks.unhook();

    for (let menu of this.tabMenus.values())
      menu.destroy();
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

    if (this.tabMenus.has(panelId))
      return;

    // xxxHonza: Tab option menu should be maintained by a panel
    // or panel-overlay instance.
    var tabMenu = new TabMenu(this.toolbox, panelId);
    this.tabMenus.set(panelId, tabMenu);
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

  // Theme API

  onApplyTheme: function(iframeWin, oldTheme) {
    if (iframeWin.location.href.indexOf("toolbox.xul") == -1)
      return;

    Trace.sysout("chrome.onApplyTheme;");

    this.customizePanelTabs(true);
    customizeSearchBox(this.toolbox, true);
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    if (iframeWin.location.href.indexOf("toolbox.xul") == -1)
      return;

    Trace.sysout("chrome.onUnapplyTheme;");

    this.customizePanelTabs(false);
    customizeSearchBox(this.toolbox, false);
  },

  /**
   * Apply/unapply 'firebug' theme on the panel tabs (toolbox)
   *
   * @param apply {Boolean} Set to true if the theme should be applied
   * otherwise false.
   */
  customizePanelTabs: function(apply) {
    let doc = this.toolbox.doc;
    let tabs = doc.querySelectorAll(".devtools-tab");

    if (apply) {
      // Disable flexible tabs.
      for (let tab of tabs) {
        tab.removeAttribute("flex");
      }
    }
    else {
      // Put back the 'flex' attribute.
      for (let tab of tabs) {
        tab.setAttribute("flex", "1");
      }

      for (let menu of this.tabMenus.values())
        menu.destroy();

      this.tabMenus = new Map();
    }
  }
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

// Exports from this module
exports.Chrome = Chrome;
