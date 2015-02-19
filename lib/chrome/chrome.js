/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { target } = require("../target.js");
const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { loadSheet } = require("sdk/stylesheet/utils");
const { defer } = require("sdk/core/promise");
const { SearchBox } = require("./search-box.js");
const { TargetWatcher } = require("./target-watcher.js");
const { Reps } = require("../reps/reps.js");
const { Events } = require("../core/events.js");
const { Theme } = require("./theme.js");
const { FirebugMenu } = require("./firebug-menu.js");
const { BasePanel } = require("./base-panel.js");
const { BaseOverlay } = require("./base-overlay.js");
const { ToolsMenu } = require("./tools-menu.js");
const { emit } = require("sdk/event/core");
const { Xul } = require("../core/xul.js");

// Xul builder creators.
const { ARROWSCROLLBOX } = Xul;

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
    this.toolsMenu = new ToolsMenu({chrome: this});

    // Map of overlay-instances for this chrome/toolbox. Instances of
    // registered panel overlays are created by {@Firebug} object.
    this.overlays = new Map();

    // Register event handlers
    this.onPanelSelected = this.onPanelSelected.bind(this);
    toolbox.on("select", this.onPanelSelected);

    // The 'select' event isn't fired when the first panel is selected
    // by default, so do it now.
    this.onPanelSelected("select", toolbox._defaultToolId);
    target.emit("onToolboxInitialize", [this.toolbox]);
  },

  onReady: function(toolbox) {
    if (this.ready) {
      return;
    }

    this.ready = true;

    Trace.sysout("chrome.onReady;");

    // Register Firebug theme listeners for toolbox customizations.
    this.applyListener = this.onApplyTheme.bind(this);
    this.unapplyListener = this.onUnapplyTheme.bind(this);
    Theme.addThemeListeners(this.applyListener, this.unapplyListener);

    // Execute theme callback for toolbox.xul since it's been already
    // fired and we need to make sure the toolbox itself is also styled.
    // This needs to be done when toolbox.frame is available.
    if (Theme.isFirebugActive()) {
      this.onApplyTheme(this.toolbox.frame.contentWindow);
    }

    // TODO: It might be useful to fire an event here, so possible
    // listeners (or extension) might want to perform custom
    // initialization steps.
  },

  /**
   * Destroy is called by the framework when Toolbox for the current
   * browser window starts the destroy process. It's based on the
   * 'toolbox-destroy' event fired by gDevTools global object.
   * All panel instances are still available at this moment.
   */
  destroy: function() {
    Trace.sysout("chrome.destroy;", this.toolbox);

    target.emit("onToolboxDestroy", [this.toolbox]);

    this.toolbox.off("select", this.onPanelSelected);

    this.targetWatcher.destroy();
    this.firebugMenu.destroy();
    this.searchBox.destroy();
    this.toolsMenu.destroy();

    // Destroy all registered overlay instances.
    for (let overlay of this.overlays.values()) {
      overlay.destroy();
    }

    Theme.removeThemeListeners(this.applyListener, this.unapplyListener);
  },

  /**
   * Close is called by the framework when Toolbox for the current
   * browser window finishes the destroy process. It's based on the
   * 'toolbox-destroyed' event fired by gDevTools global object.
   * All panel instances are destroyed and not accessible at this
   * moment.
   */
  close: function() {
    // Destroy the {@TargetWatcher} when the toolbox is completely
    // closed, including all panels.
    this.targetWatcher.destroy();

    // Set to null to indicate that the toolbox has been destroyed.
    this.toolbox = null;
  },

  // Overlays

  getOverlay: function(id) {
    return this.overlays.get(id);
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
    let panelId = "dev-panel-firebugsoftware-joehewitt-com-DOM";
    this.toolbox.selectTool(panelId).then((panel) => {
      panel.select(object);
    });
  },

  onPanelSelected: function(eventId, panelId) {
    Trace.sysout("chrome.onPanelSelected; " + panelId);

    if (this.selectedPanel) {
      this.selectedPanel.onHide();
    }

    this.selectedPanel = getPanel(this.toolbox, panelId);

    if (this.selectedPanel) {
      this.selectedPanel.onShow();
    }

    emit(this, "panel-selected", this.selectedPanel);
  },

  onPanelContentClick: function(event) {
    Trace.sysout("chrome.onPanelContentClick;", event);

    let repNode = Reps.getRepNode(event.target);
    if (repNode) {
      let object = Reps.getRepObject(repNode);
      let rep = Reps.getRep(object);
      let realObject = rep ? rep.getRealObject(object) : null;
      let realRep = realObject ? Reps.getRep(realObject) : rep;
      if (!realObject) {
        realObject = object;
      }

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
    if (win != this.toolbox.frame.contentWindow) {
      return;
    }

    Trace.sysout("chrome.onApplyTheme;");

    this.firebugMenu.onApplyTheme(win, oldTheme);
    this.searchBox.onApplyTheme(win, oldTheme);
    this.toolsMenu.onApplyTheme(win, oldTheme);

    this.customizePanelTabs(true);
  },

  onUnapplyTheme: function(win, newTheme) {
    if (win != this.toolbox.frame.contentWindow) {
      return;
    }

    Trace.sysout("chrome.onUnapplyTheme;");

    this.firebugMenu.onUnapplyTheme(win, newTheme);
    this.searchBox.onUnapplyTheme(win, newTheme);
    this.toolsMenu.onUnapplyTheme(win, newTheme);

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
    if (!this.toolbox) {
      return;
    }

    let doc = this.toolbox.doc;
    if (!doc) {
      Trace.sysout("chrome.customizePanelTabs; No document bail out");
      return;
    }

    let tabs = doc.querySelectorAll(".devtools-tab");

    // Customize panel tabs. Firebug theme removes the flex attribute
    // in order to save valuable horizontal space in the tab-bar.
    if (apply) {
      for (let tab of tabs) {
        tab.removeAttribute("flex");
      }
    } else {
      for (let tab of tabs) {
        tab.setAttribute("flex", "1");
      }
    }

    let tabStrip = doc.querySelector("#toolbox-tabs");

    // Create or remove the arrow scrolling box. The scrolling box is
    // inserted into the main tab-strip (main panel tab list).
    if (apply && !this.scrollBox) {
      this.scrollBox = ARROWSCROLLBOX({
        orient: "horizontal",
        flex: 1
      }).build(tabStrip);
    } else if (!apply && this.scrollBox) {
      this.scrollBox.remove();
      this.scrollBox = null;
    }

    // Filter out the Options tab
    tabs = Array.filter(tabs, tab => tab.id != "toolbox-tab-options");

    // Move all tabs that are not yet in the scroll box (except of the
    // Options tab) into the scroll box or (them unapply) move them back
    // into the original tab-strip.
    if (apply) {
      Array.forEach(tabs, tab => {
        if (tab.parentNode != this.scrollBox) {
          this.scrollBox.appendChild(tab);
        }
      });
    } else {
      Array.forEach(tabs, tab => {
        tabStrip.appendChild(tab);
      });
    }
  },

  getPanelWhenReady: function(panelId) {
    return getPanelWhenReady(this.toolbox, panelId);
  }
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
  if (!panel) {
    return;
  }

  if (panel instanceof BasePanel) {
    return panel;
  }

  let overlay = panel._firebugPanelOverlay;
  if (!overlay) {
    return;
  }

  if (overlay instanceof BaseOverlay) {
    return overlay;
  }
}

/**
 * Helper function, allows to get specified {@Toolbox} panel.
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
