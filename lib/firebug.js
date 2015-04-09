/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { extend } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");
const { Locale } = require("./core/locale.js");
const { Theme } = require("./chrome/theme.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { setTimeout } = require("sdk/timers");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
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
Locale.registerStringBundle("chrome://firebug/locale/reps.properties");
Locale.registerStringBundle("chrome://firebug/locale/net-export.properties");

const { Chrome } = require("./chrome/chrome.js");

// All top level modules should be required here.
require("./chrome/activation.js");
require("./chrome/window-watcher.js");
require("./chrome/start-button.js");
require("./chrome/page-context-menu.js");
require("./inspector/inspector-button.js");
require("./dom/dom-panel.js");
require("./console/remote/logging.js");
require("./debug/telemetry.js");
require("./chrome/panel-registrar.js");

// Reps
require("./reps/common.js");
require("./reps/storage.js"); // xxxHonza: needs to be here FIX ME
require("./reps/xpathresult.js"); // xxxHonza: needs to be here FIX ME
require("./reps/grip.js");
require("./reps/document.js");
require("./reps/array.js");
require("./reps/element.js");
require("./reps/object-with-url.js");
require("./reps/function.js");
require("./reps/text-node.js");
require("./reps/css-rule.js");
require("./reps/attribute.js");
require("./reps/named-node-map.js");
require("./reps/date-time.js");
require("./reps/window.js");
require("./reps/regexp.js");
require("./reps/stylesheet.js");
require("./reps/event.js");

// SDK changes (should be removed as soon as the API are built-in).
const MarkupViewPatch = require("./sdk/markup-view-patch.js");

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
   * {@Chrome.inintialization} method.
   */
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("firebug.initialize; options: ", options);

    // Map of all existing {@Chrome} instances. Every instance corresponds
    // to one native {@Toolbox} instance.
    this.chromes = new Map();

    // Bind DevTools event handlers.
    this.onToolboxCreated = this.onToolboxCreated.bind(this);
    this.onToolboxReady = this.onToolboxReady.bind(this);
    this.onToolboxDestroy = this.onToolboxDestroy.bind(this);
    this.onToolboxClosed = this.onToolboxClosed.bind(this);
    this.updateOption = this.updateOption.bind(this);
    this.onToolRegistered = this.onToolRegistered.bind(this);

    // Hook developer tools events.
    gDevTools.on("toolbox-created", this.onToolboxCreated);
    gDevTools.on("toolbox-ready", this.onToolboxReady);
    gDevTools.on("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.on("toolbox-destroyed", this.onToolboxClosed);
    gDevTools.on("pref-changed", this.updateOption);
    gDevTools.on("tool-registered", this.onToolRegistered);

    // Iterate list of overlay-definitions and register them.
    // There are other built-in panels (hidden by default) like
    // e.g. Canvas and WebAudio that would also deserve
    // an overlay with support for Firebug theme.
    this.overlays = [
      {id: "inspector", ctor: InspectorOverlay},
      {id: "webconsole", ctor: ConsoleOverlay},
      {id: "jsdebugger", ctor: DebuggerOverlay},
      {id: "styleeditor", ctor: StyleEditorOverlay},
      {id: "jsprofiler", ctor: ProfilerOverlay},
      {id: "timeline", ctor: TimelineOverlay},
      {id: "netmonitor", ctor: NetworkOverlay},
      {id: "options", ctor: OptionsOverlay},
    ];

    for (let overlay of this.overlays) {
      this.registerOverlay(overlay);
    }

    // Firebug introduces a new theme that is available in the Options
    // panel (together with the built-in Light and Dark themes).
    // The Firebug theme is also automatically set as the default one
    // when Firebug is installed.
    Theme.registerFirebugTheme(options);
  },

  /**
   * Register an overlay. This happens when Firebug extension initializes
   * itself at the very beginning (when Firefox starts or Firebug is just
   * installed or enabled).
   *
   * The purpose of the registration is to handle '{panel.id}-init' event
   * (that is fired every time a panel is created) and create an instance
   * of the overlay. List of actual overlay-instances for particular
   * {@Toolbox} is stored in corresponding {@Chrome} object.
   *
   * Panel initialization happens every time when a toolbox is created/opened
   * and the panel selected.
   * Note that instance of the toolbox is created for every tab in every
   * browser window. It can also be closed and created again for the same tab.
   */
  registerOverlay: function(overlay) {
    Trace.sysout("firebug.registerOverlay; " + overlay.id, overlay);

    // Listen for panel initialization event.
    let onApplyOverlay = (eventId, toolbox, panelFrame) => {
      Trace.sysout("firebug.onApplyOverlay; " + eventId, panelFrame);

      let chrome = this.getChrome(toolbox);
      chrome.onReady(toolbox);

      try {
        // Create instance of an overlay
        let instance = new overlay.ctor({
          panelFrame: panelFrame,
          toolbox: toolbox,
          chrome: chrome,
          id: overlay.id
        });

        // Store overlay instance in the Chrome object, so we can clean
        // it up at the end.
        chrome.overlays.set(overlay.id, instance);

        // Register for 'build' event (panel instance created).
        toolbox.once(overlay.id + "-build", (eventId, panel) => {
          Trace.sysout("firebug.applyOverlay; " + eventId, panel);
          instance.onBuild({toolbox: toolbox, panel: panel});
        });

        // Register for 'ready' event (panel frame loaded).
        toolbox.once(overlay.id + "-ready", (eventId, panel) => {
          Trace.sysout("firebug.applyOverlay; " + eventId, panel);
          instance.onReady({toolbox: toolbox, panel: panel});
        });
      }
      catch (err) {
        TraceError.sysout("chrome.initialize; Overlay for: " + overlay.id +
          " EXCEPTION " + err, err);
      }
    };

    // Use 'on' (not 'once') listener since the '*-init' event is sent
    // every time the toolbox is closed and opened again. The listener
    // will be removed in destroyOverlay method when Firebug is destroyed.
    gDevTools.on(overlay.id + "-init", onApplyOverlay);

    // Remember the listener, so we can remove at shutdown.
    overlay.onApplyOverlay = onApplyOverlay;
  },

  unregisterOverlay: function(overlay) {
    Trace.sysout("firebug.unregisterOverlay; " + overlay.id, overlay);

    // Remove the init listener.
    gDevTools.off(overlay.id + "-init", overlay.onApplyOverlay);
  },

  /**
   * Executed by the framework when Firebug is destroyed.
   * I happens when the entire extension is disabled, unloaded or
   * removed.
   */
  shutdown: function(reason) {
    Trace.sysout("firebug.shutdown; " + reason);

    emit(this, "shutdown", reason);

    gDevTools.off("toolbox-created", this.onToolboxCreated);
    gDevTools.off("toolbox-ready", this.onToolboxReady);
    gDevTools.off("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.off("toolbox-destroyed", this.onToolboxClosed);
    gDevTools.off("pref-changed", this.updateOption);
    gDevTools.off("tool-registered", this.onToolRegistered);

    // Unapply temporary patches
    MarkupViewPatch.shutdown();

    Theme.unregisterFirebugTheme(reason);

    for (let overlay of this.overlays) {
      this.unregisterOverlay(overlay);
    }

    // Firebug is destroyed, so destroy also all existing chrome objects.
    for (let chrome of this.chromes.values()) {
      chrome.destroy();
    }

    // Workaround for: https://github.com/firebug/firebug.next/issues/91
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1069832
    // xxxHonza: also, ask for a way to specify custom IDs for new panels.
    gDevTools.unregisterTool({id: "dev-panel-firebugsoftware-joehewitt-com-DOM"});
    gDevTools.unregisterTool({id: "dev-panel-firebugsoftware-joehewitt-com-Hello-World"});
  },

  // Toolbox Life Cycle Events

  onToolboxCreated: function(eventId, toolbox) {
    Trace.sysout("firebug.onToolboxCreated;", toolbox);

    // Create {@Chrome} object as soon as possible, so we don't
    // miss any events.
    let chrome = this.getChrome(toolbox);

    // Notify registered modules/services.
    this.target.emit("onToolboxCreated", arguments);
  },

  /**
   * Executed by the framework when {@Toolbox} is opened and ready to use.
   * There is one instance of the {@Toolbox} per browser window.
   * The event is fired after the current panel is opened & loaded (usually
   * happens asynchronously) and ready to use.
   */
  onToolboxReady: function(event, toolbox) {
    Trace.sysout("firebug.onToolboxReady; ", toolbox);

    // Make sure {@Chrome} instance exists for the toolbox (it's created
    // in getChrome() method). Note that it might be already created if
    // the selected panel has an overlay (see registerOverlay).
    let chrome = this.getChrome(toolbox);
    chrome.onReady(toolbox);

    // Notify registered modules/services.
    this.target.emit("onToolboxReady", arguments);
  },

  /**
   * Executed by the framework at the beginning of the {@Toolbox} destroy
   * process. All instantiated panel objects are still available, which
   * makes this method suitable for e.g. removing all event listeners.
   */
  onToolboxDestroy: function(eventId, target) {
    Trace.sysout("firebug.onToolboxDestroy;", target);

    let chrome = this.chromes.get(target);
    if (!chrome) {
      Trace.sysout("firebug.onToolboxDestroy; ERROR unknown target!", target);
      return;
    }

    this.target.emit("onToolboxDestroy", arguments);
  },

  /**
   * Executed by the framework at the end of the {@Toolbox} destroy
   * process. All panel objects are also destroyed at this moment
   * (happens asynchronously).
   */
  onToolboxClosed: function(eventId, target) {
    Trace.sysout("firebug.onToolboxClosed;", target);

    let chrome = this.chromes.get(target);
    if (!chrome) {
      Trace.sysout("firebug.onToolboxClosed; ERROR unknown target!", target);
      return;
    }

    // A toolbox object has been destroyed, so destroy even the corresponding
    // {@Chrome} object.
    chrome.destroy();

    chrome.close();

    this.chromes.delete(target);
  },

  onToolRegistered: function(eventId, toolId) {
    Trace.sysout("firebug.onToolRegistered; " + toolId);

    if (Theme.isFirebugActive()) {
      // Make sure to properly update tool-tabs that are appended
      // dynamically. It needs to be done after timeout since the
      // <tab> element creation is done within another "tool-registered"
      // event handler (executed sooner).
      setTimeout(() => {
        for (let chrome of this.chromes.values()) {
          chrome.customizePanelTabs(true);
        }
      });
    }
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

  // Options

  updateOption: function(eventType, data) {
    Trace.sysout("firebug.updateOption; ", data);

    emit(this, "updateOption", data.pref, data.newValue, data.oldValue);
  },

  getChrome: function(toolbox) {
    let target = toolbox.target;
    let chrome = this.chromes.get(target);
    if (!chrome) {
      chrome = new Chrome(toolbox);
      this.chromes.set(target, chrome);
    }
    return chrome;
  },

  getContext: function(toolbox) {
    return this.getChrome(toolbox).getContext();
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
