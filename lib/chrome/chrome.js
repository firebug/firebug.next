/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet } = require("sdk/stylesheet/utils");
const { defer } = require("sdk/core/promise");
const { SearchBox } = require("./searchBox.js");
const { TargetWatcher } = require("./targetWatcher.js");
const { TransportHooks } = require("../debug/transportHooks.js");
const { Reps } = require("../reps/reps.js");
const { Events } = require("../core/events.js");
const { Theme } = require("./theme.js");
const { FirebugMenu } = require("./firebugMenu.js");
const { BasePanel } = require("./basePanel.js");
const { BaseOverlay } = require("./baseOverlay.js");

/**
 * This object represents a wrapper for native developer tools {@Toolbox}.
 * There is one instance of this object per browser window.
 * {@Chrome} instances are created by the {@Firebug} object.
 */
const Chrome = Class(
/** @lends Chrome */
{
  extends: EventTarget,

  // Initialization

  /**
   * The initialization happens when "toolbox-ready" event is fired
   * by gDevTools global. This is the place where Firebug UI initialization
   * steps should be performed.
   */
  initialize: function(toolbox) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("chrome.initialize;", toolbox);

    this.toolbox = toolbox;
    this.targetWatcher = new TargetWatcher({chrome: this});
    this.firebugMenu = new FirebugMenu({chrome: this});
    this.searchBox = new SearchBox({chrome: this});

    // Map of overlay-instances for this chrome/toolbox. Instances of
    // registered panel overlays are created by {@Firebug} object.
    this.overlays = new Map();

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

  /**
   * Destroy is called by the framework when Toolbox for the current
   * browser window is destroyed.
   */
  destroy: function() {
    Trace.sysout("chrome.destroy;", this.toolbox);

    this.toolbox.off("select", this.onPanelSelected);

    this.targetWatcher.destroy();
    this.firebugMenu.destroy();
    this.searchBox.destroy();
    this.hooks.unhook();

    // Destroy all registered overlay instances.
    for (let overlay of this.overlays.values()) {
      overlay.destroy();
    }

    // Set to null to indicate that the toolbox has been destroyed.
    // (theme hooks fires after toolbox destroy).
    this.toolbox = null;
  },

  // Overlays

  getOverlay: function(id) {
    return this.overlays[id];
  },

  // Browser

  getBrowserDoc: function() {
    return this.toolbox.doc.defaultView.top.document;
  },

  // Context

  getContext: function() {
    return this.targetWatcher.getContext();
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

  onPanelSelected: function(eventId, panelId) {
    Trace.sysout("chrome.onPanelSelected; " + panelId);

    let panel = getPanel(this.toolbox, panelId);
    if (panel) {
      panel.onSelected();
    }
  },

  onPanelContentClick: function(event) {
    Trace.sysout("chrome.onPanelContentClick; ", event);

    // xxxHonza: unwrapping everywhere is not good idea.
    var target = XPCNativeWrapper.unwrap(event.target);
    var repNode = Reps.getRepNode(target);
    if (repNode) {
      var object = Reps.getRepObject(repNode);
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

  onApplyTheme: function(win, oldTheme) {
    if (win.location.href.indexOf("toolbox.xul") == -1)
      return;

    Trace.sysout("chrome.onApplyTheme;");

    this.firebugMenu.onApplyTheme(win, oldTheme);
    this.searchBox.onApplyTheme(win, oldTheme);

    this.customizePanelTabs(true);
  },

  onUnapplyTheme: function(win, newTheme) {
    if (win.location.href.indexOf("toolbox.xul") == -1)
      return;

    Trace.sysout("chrome.onUnapplyTheme;");

    this.firebugMenu.onUnapplyTheme(win, newTheme);
    this.searchBox.onUnapplyTheme(win, newTheme);

    this.customizePanelTabs(false);
  },

  /**
   * Apply/unapply 'firebug' theme on the panel tabs (toolbox)
   *
   * @param apply {Boolean} Set to true if the theme should be applied
   * otherwise false.
   */
  customizePanelTabs: function(apply) {
    // Might be already destroyed.
    if (!this.toolbox)
      return;

    let doc = this.toolbox.doc;
    let tabs = doc.querySelectorAll(".devtools-tab");

    // Customize panel tabs. Firebug theme removes the flex attribute
    // in order to save valuable horizontal space in the tab-bar.
    // xxxHonza: what if the default flex attribute is removed in the
    // future? It shouldn't be set back. TEST ME
    if (apply) {
      for (let tab of tabs) {
        tab.removeAttribute("flex");
      }
    } else {
      for (let tab of tabs) {
        tab.setAttribute("flex", "1");
      }
    }
  },
});

// Helper methods (private in this module, for now)

/**
 * Returns an instance of a panel {@BasePanel} for panels based on SDK
 * or an instance of a panel overlay {@BaseOverlay} for built-in
 * panels (not based on SDK) or null e.g. if there is no overlay for
 * specific built-in panel.
 *
 * xxxHonza: we might want to have a list of all overlays + list of all
 * custom (SDK based) panel instances in the future.
 */
function getPanel(toolbox, id) {
  let panel = toolbox.getPanel(id);
  if (!panel)
    return;

  if (panel instanceof BasePanel)
    return panel;

  let overlay = panel._firebugPanelOverlay;
  if (!overlay)
    return;

  if (overlay instanceof BaseOverlay)
    return overlay;
}

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
