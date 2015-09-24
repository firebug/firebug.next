/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const { Cu, Ci } = require("chrome");
const { extend } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { setTimeout } = require("sdk/timers");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { ToolboxChrome } = require("firebug.sdk/lib/toolbox-chrome.js");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { devtools, gDevTools } = require("firebug.sdk/lib/core/devtools.js");

// Platform
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm", {});

// Register string bundles before any rep or chrome modules are loaded.
Locale.registerStringBundle("chrome://firebug/locale/firebug.properties");
Locale.registerStringBundle("chrome://firebug/locale/style-editor.properties");
Locale.registerStringBundle("chrome://firebug/locale/debugger.properties");
Locale.registerStringBundle("chrome://firebug/locale/performance-timing.properties");
Locale.registerStringBundle("chrome://firebug/locale/console.properties");
Locale.registerStringBundle("chrome://firebug/locale/dom.properties");
Locale.registerStringBundle("chrome://firebug/locale/network.properties");
Locale.registerStringBundle("chrome://firebug/locale/inspector.properties");
Locale.registerStringBundle("chrome://firebug/locale/search-box.properties");
Locale.registerStringBundle("chrome://firebug/locale/xhr-spy.properties");
Locale.registerStringBundle("chrome://firebug/locale/net-export.properties");

// Firebug
const { Theme } = require("./chrome/theme.js");

// All top level modules should be required here.
require("./chrome/start-button.js");
require("./inspector/inspector-button.js");
require("./dom/dom-panel.js");
require("./debug/telemetry.js");

// Overlay for the Toolbox.
const { FirebugToolboxOverlay } = require("./chrome/firebug-toolbox-overlay.js");

// Overlays for built-in Toolbox panels.
const { InspectorOverlay } = require("./inspector/inspector-overlay.js");
const { ConsoleOverlay } = require("./console/console-overlay.js");
const { DebuggerOverlay } = require("./debugger/debugger-overlay.js");
const { StyleEditorOverlay } = require("./style/style-editor-overlay.js");
const { ProfilerOverlay } = require("./profiler/profiler-overlay.js");
const { TimelineOverlay } = require("./timeline/timeline-overlay.js");
const { NetworkOverlay } = require("./net/network-overlay.js");
const { OptionsOverlay } = require("./options/options-overlay.js");

/**
 * This object represents the main Firebug application object,
 * The Firebug you have known and loved.
 *
 * It's singleton and there is one instance shared across all
 * browser windows.
 */
var Firebug = extend(EventTarget.prototype,
/** @lends Firebug */
{
  /**
   * The initialization happens when Firefox starts and Firebug extension
   * is loaded (see also the main.js module).
   * The logic here should be as simple as possible to make sure it
   * doesn't slow down the start up time. Typical action that can
   * be done here is global browser modifications like e.g.
   * inserting new menu items in Firefox (context) menus.
   * Actions related to Firebug UI should be done within
   * {@FirebugToolboxOverlay.initialization} method.
   */
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("firebug.initialize; options: ", options);

    ToolboxChrome.registerToolboxOverlay(FirebugToolboxOverlay);

    ToolboxChrome.registerPanelOverlay(ConsoleOverlay);
    ToolboxChrome.registerPanelOverlay(InspectorOverlay);
    ToolboxChrome.registerPanelOverlay(DebuggerOverlay);
    ToolboxChrome.registerPanelOverlay(StyleEditorOverlay);
    ToolboxChrome.registerPanelOverlay(ProfilerOverlay);
    ToolboxChrome.registerPanelOverlay(TimelineOverlay);
    ToolboxChrome.registerPanelOverlay(NetworkOverlay);
    ToolboxChrome.registerPanelOverlay(OptionsOverlay);

    // Firebug introduces a new theme that is available in the Options
    // panel (together with the built-in Light and Dark themes).
    // The Firebug theme is also automatically set as the default one
    // when Firebug is installed.
    Theme.registerFirebugTheme(options);
  },

  /**
   * Executed by the framework when Firebug is destroyed.
   * I happens when the entire extension is disabled, unloaded or
   * removed.
   */
  shutdown: function(reason) {
    Trace.sysout("firebug.shutdown; " + reason);

    Theme.unregisterFirebugTheme(reason);

    // Workaround for: https://github.com/firebug/firebug.next/issues/91
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1069832
    // xxxHonza: also, ask for a way to specify custom IDs for new panels.
    gDevTools.unregisterTool({id: "dev-panel-firebugsoftware-joehewitt-com-DOM"});
    gDevTools.unregisterTool({id: "dev-panel-firebugsoftware-joehewitt-com-Hello-World"});

    ToolboxChrome.unregisterToolboxOverlay(FirebugToolboxOverlay);
    ToolboxChrome.unregisterPanelOverlay(ConsoleOverlay);
    ToolboxChrome.unregisterPanelOverlay(InspectorOverlay);
    ToolboxChrome.unregisterPanelOverlay(DebuggerOverlay);
    ToolboxChrome.unregisterPanelOverlay(StyleEditorOverlay);
    ToolboxChrome.unregisterPanelOverlay(ProfilerOverlay);
    ToolboxChrome.unregisterPanelOverlay(TimelineOverlay);
    ToolboxChrome.unregisterPanelOverlay(NetworkOverlay);
    ToolboxChrome.unregisterPanelOverlay(OptionsOverlay);
  },

  // Toolbox API

  /**
   * Returns reference to the Toolbox associated with the parent
   * browser window.
   *
   * @param {Window} win A window in the current browser. If no
   * window is specified the toolbox from the current most recent
   * browser window is used.
   */
  getToolbox: function(win) {
    let tab = getCurrentTab(win);
    if (tab) {
      let target = devtools.TargetFactory.forTab(tab);
      return gDevTools.getToolbox(target);
    }
  },

  /**
   * Open the toolbox with default panel selected.
   *
   * @param {Window} win A window in the current browser. If no
   * window is specified the toolbox from the current most recent
   * browser window is used.
   *
   * @returns A promise that is resolved as soon as the toolbox
   * is opened and fully ready (just before "toolbox-ready" event is fired).
   */
  showToolbox: function(win, toolId) {
    let tab = getCurrentTab(win);
    let target = devtools.TargetFactory.forTab(tab);
    return gDevTools.showToolbox(target, toolId);
  },

  /**
   * Destroy toolbox for the given window.
   */
  destroyToolbox: function(win) {
    let toolbox = this.getToolbox(win);
    if (toolbox) {
      return toolbox.destroy();
    }
  },

  // Commands

  about: function() {
    AddonManager.getAddonByID(self.id, function (addon) {
      let browser = getMostRecentBrowserWindow();
      browser.openDialog("chrome://mozapps/content/extensions/about.xul", "",
        "chrome,centerscreen,modal", addon);
    });
  }
});

// Helpers

function getCurrentTab(win) {
  if (win) {
    let browserDoc = win.top.document;

    // The browser (id='content') is null in case the Toolbox is
    // detached from the main browser window.
    // xxxHonza: how to get the associated browser window?
    let browser = browserDoc.getElementById("content");
    if (browser) {
      return browser.selectedTab;
    }
  }

  // xxxHonza: do we really want this fall-back? It isn't safe to get
  // the last active browser window. It doesn't have to be the parent
  // browser window the toolbox has been created for.
  let browser = getMostRecentBrowserWindow();
  if (browser) {
    return browser.gBrowser.mCurrentTab;
  }
}

// Exports from this module
exports.Firebug = Firebug;
