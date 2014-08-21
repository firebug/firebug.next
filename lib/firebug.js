/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { extend } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { emit } = require("sdk/event/core");
const { defer } = require("sdk/core/promise");
const { Locale } = require("./core/locale.js");
const { Theme } = require("./chrome/theme.js");

// Register string bundles before any rep or chrome modules are loaded.
Locale.registerStringBundle("chrome://firebug/locale/firebug.properties");
Locale.registerStringBundle("chrome://firebug/locale/style-editor.properties");

const { Chrome } = require("./chrome/chrome.js");
const { WindowWatcher } = require("./chrome/windowWatcher.js");

// All top level modules should be required here.
require("./chrome/pageContextMenu.js");
require("./chrome/toolbarButton.js");
require("./dom/domPanel.js");

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

// Hello World (will be removed at some point)
require("./helloWorld/helloWorldPanel.js");

// SDK changes (should be removed as soon as the API are built-in).
const ToolboxPatch = require("./sdk/toolboxPatch.js");
const MarkupViewPatch = require("./sdk/markup-view-patch.js");

// Overlays
const { InspectorOverlay } = require("./inspector/inspectorOverlay.js");
const { ConsoleOverlay } = require("./console/consoleOverlay.js");
const { DebuggerOverlay } = require("./debugger/debuggerOverlay.js");
const { StyleEditorOverlay } = require("./style/style-editor-overlay.js");
const { ProfilerOverlay } = require("./profiler/profiler-overlay.js");
const { NetworkOverlay } = require("./net/network-overlay.js");
const { OptionsOverlay } = require("./options/optionsOverlay.js");

// Map of all existing Chrome instances (= Toolbox instances)
var chromes = new Map();

/**
 * This object represents the main Firebug application object. Firebug
 * object is a singleton and there is one instance shared across all
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

    // Iterate list of overlays and apply them on existing panels.
    // There are other built-in panel (hidden by default) like
    // e.g. Canvas and WebAudiothat would probably also deserve
    // an overlay with support for Firebug theme at least.
    this.overlays = [
      {id: "inspector", ctor: InspectorOverlay},
      {id: "webconsole", ctor: ConsoleOverlay},
      {id: "jsdebugger", ctor: DebuggerOverlay},
      {id: "styleeditor", ctor: StyleEditorOverlay},
      {id: "profiler", ctor: ProfilerOverlay},
      {id: "netmonitor", ctor: NetworkOverlay},
      {id: "options", ctor: OptionsOverlay},
    ];

    for (let overlay of this.overlays)
      this.applyOverlay(overlay);

    // Firebug introduces a new theme that is available in the Options
    // panel (together with the built-in Light and Dark themes).
    Theme.registerFirebugTheme();

    // Watch browser window create/destroy events.
    WindowWatcher.initialize();
  },

  /**
   * Apply overlay when an existing toolbox panel is initializing.
   * The '{panel.id}-init' event is fired every time the panel is initialized,
   * which happens when the toolbox is opened. Note that toolbox can be opened
   * multiple times during one Firefox session if the user closes and
   * reopens it.
   */
  applyOverlay: function(overlay) {
    Trace.sysout("firebug.applyOverlay; " + overlay.id, overlay);

    // Listen for pane initialization event.
    let onApplyOverlay = (eventId, toolbox, panelFrame) => {
      Trace.sysout("firebug.onApplyOverlay; " + eventId, panelFrame);

      try {
        // Create instance of an overlay
        let instance = new overlay.ctor({
          panelFrame: panelFrame,
          toolbox: toolbox,
        });

        // Remember the overlay instance, so we can clean it up at the end.
        overlay.instance = instance;

        // Register for 'built' event (panel instance created).
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
    overlay._initListener = onApplyOverlay;
  },

  destroyOverlay: function(overlay) {
    Trace.sysout("firebug.destroyOverlay; " + overlay.id, overlay);

    gDevTools.off(overlay.id + "-init", overlay._initListener);

    // Instance of the overlay isn't created if the associated panel
    // was never initialized.
    if (overlay.instance)
      overlay.instance.destroy();
  },

  /**
   * Executed by the framework when Firebug is destroyed.
   * I happens when the entire extension is disabled, unloaded or
   * removed.
   */
  shutdown: function(reason) {
    Trace.sysout("firebug.shutdown; " + reason);

    // Unapply temporary patches
    ToolboxPatch.shutdown();
    MarkupViewPatch.shutdown();

    Theme.unregisterFirebugTheme();

    for (let overlay of this.overlays)
      this.destroyOverlay(overlay);

    // Firebug is destroyed, so destroy also all existing chrome objects.
    for (let chrome of chromes.values())
      chrome.destroy();

    WindowWatcher.shutdown();
  },

  // Toolbox API

  /**
   * Executed by the framework when {@Toolbox} is opened and ready to use.
   * There is one instance of the {@Toolbox} per browser window.
   */ 
  onToolboxReady: function(event, toolbox) {
    Trace.sysout("firebug.onToolboxReady; ", toolbox);

    this.toolbox = toolbox;

    // Create new {@Chrome} instance for the newly opened {@Toolbox}
    // There is one {@Chrome} per browser window.
    var chrome = new Chrome(toolbox);
    chromes.set(toolbox.target, chrome);
  },

  onToolboxDestroyed: function(eventId, target) {
    Trace.sysout("firebug.onToolboxDestroyed;", target);

    var chrome = chromes.get(target);
    if (!chrome)
    {
      Trace.sysout("firebug.onToolboxDestroyed; ERROR unknown target!",
        target);
      return;
    }

    // A toolbox object has been destroyed, so destroy even the corresponding
    // {@Chrome} object.
    chrome.destroy();
    chromes.delete(target);
  },

  /**
   * Returns reference to the Toolbox associated with the parent
   * browser window.
   *
   * @param {Window} win A window in the current browser.
   */
  getToolbox: function(win) {
    let browserDoc = win.top.document;
    let gBrowser = browserDoc.getElementById("content");
    let target = devtools.TargetFactory.forTab(gBrowser.selectedTab);
    return gDevTools.getToolbox(target);
  },

  // Options
  updateOption: function(eventType, data) {
    Trace.sysout("firebug.updateOption; ", data);

    emit(this, "updateOption", data.pref, data.newValue, data.oldValue);
  },

  getChrome: function(toolbox) {
    return chromes.get(toolbox.target);
  },

  // Registration methods
  registerPanel: function(panel) {
    // TODO: panel registration
  }
});

// Exports from this module
exports.Firebug = Firebug;
