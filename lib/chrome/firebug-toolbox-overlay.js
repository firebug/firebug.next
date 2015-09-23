/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

// Add-on SDK
const { Cu, Ci } = require("chrome");
const { EventTarget } = require("sdk/event/target");
const { loadSheet } = require("sdk/stylesheet/utils");
const { defer } = require("sdk/core/promise");
const { emit } = require("sdk/event/core");

// Firebug SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { Dispatcher } = require("firebug.sdk/lib/dispatcher.js");
const { ToolboxOverlay } = require("firebug.sdk/lib/toolbox-overlay.js");

// Firebug
const { SearchBox } = require("./search-box.js");
const { Events } = require("../core/events.js");
const { Theme } = require("./theme.js");
const { FirebugMenu } = require("./firebug-menu.js");
const { BasePanel } = require("./base-panel.js");
const { BaseOverlay } = require("./base-overlay.js");
const { ToolsMenu } = require("./tools-menu.js");
const { Xul } = require("../core/xul.js");

// DevTools
const { gDevTools } = require("firebug.sdk/lib/core/devtools.js");

// Xul builder creators.
const { ARROWSCROLLBOX } = Xul;

/**
 * This object represents a wrapper for native developer tools {@Toolbox}.
 * There is one instance of this object per browser window.
 */
const FirebugToolboxOverlay = Class(
/** @lends FirebugToolboxOverlay */
{
  extends: ToolboxOverlay,
  extends: EventTarget,

  overlayId: "FirebugToolboxOverlay",

  // Initialization

  /**
   * The initialization happens when "toolbox-ready" event is fired
   * by gDevTools global. This is the place where Firebug UI initialization
   * steps should be performed.
   */
  initialize: function(options) {
    ToolboxOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("FirebugToolboxOverlay.initialize;");

    this.firebugMenu = new FirebugMenu({toolbox: this.toolbox});
    this.searchBox = new SearchBox({chrome: this});
    this.toolsMenu = new ToolsMenu({toolbox: this.toolbox});

    // Register event handlers
    this.onPanelSelected = this.onPanelSelected.bind(this);
    this.toolbox.on("select", this.onPanelSelected);

    // The 'select' event isn't fired when the first panel is selected
    // by default, so do it now.
    this.onPanelSelected("select", this.toolbox._defaultToolId);

    this.onToolRegistered = this.onToolRegistered.bind(this);
    gDevTools.on("tool-registered", this.onToolRegistered);
  },

  /**
   * Destroy is called by the framework when Toolbox for the current
   * browser window starts the destroy process. It's based on the
   * 'toolbox-destroy' event fired by gDevTools global object.
   * All panel instances are still available at this moment.
   */
  destroy: function() {
    Trace.sysout("FirebugToolboxOverlay.destroy;", this.toolbox);

    gDevTools.off("tool-registered", this.onToolRegistered);

    this.firebugMenu.destroy();
    this.searchBox.destroy();
    this.toolsMenu.destroy();

    Theme.removeThemeListeners(this.applyListener, this.unapplyListener);
  },

  onReady: function(options) {
    if (this.ready) {
      return;
    }

    this.browserDoc = this.toolbox.doc.defaultView.top.document;

    this.ready = true;

    Trace.sysout("FirebugToolboxOverlay.onReady;");

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

  // Toolbox Events

  onToolRegistered: function(eventId, toolId) {
    Trace.sysout("firebug.onToolRegistered; " + toolId);

    if (Theme.isFirebugActive()) {
      // Make sure to properly update tool-tabs that are appended
      // dynamically. It needs to be done after timeout since the
      // <tab> element creation is done within another "tool-registered"
      // event handler (executed sooner).
      setTimeout(() => {
        this.customizePanelTabs(true);
      });
    }
  },

  // Browser

  getBrowserDoc: function() {
    return this.browserDoc;
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

  // Theme API

  onApplyTheme: function(win, oldTheme) {
    if (win != this.toolbox.frame.contentWindow) {
      return;
    }

    Trace.sysout("FirebugToolboxOverlay.onApplyTheme;");

    this.firebugMenu.onApplyTheme(win, oldTheme);
    this.searchBox.onApplyTheme(win, oldTheme);
    this.toolsMenu.onApplyTheme(win, oldTheme);

    this.customizePanelTabs(true);
  },

  onUnapplyTheme: function(win, newTheme) {
    if (win != this.toolbox.frame.contentWindow) {
      return;
    }

    Trace.sysout("FirebugToolboxOverlay.onUnapplyTheme;");

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
      Trace.sysout("FirebugToolboxOverlay.customizePanelTabs; No document bail out");
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
exports.FirebugToolboxOverlay = FirebugToolboxOverlay;
