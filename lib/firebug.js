/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./core/trace.js");
const { extend } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { emit } = require("sdk/event/core");
const { defer } = require("sdk/core/promise");
const { Locale } = require("./core/locale.js");

// Register string bundles before any rep or chrome modules are loaded.
Locale.registerStringBundle("chrome://firebug/locale/firebug.properties");

const { Chrome } = require("./chrome/chrome.js");

// All top level modules should be required here.
require("./chrome/pageContextMenu.js");
require("./chrome/toolbarButton.js");
require("./chrome/windowWatcher.js");
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
require("./sdk/toolboxPatch.js");
require("./sdk/markup-view-patch.js");

// Overlays
const { ConsoleOverlay } = require("./console/consoleOverlay.js");
const { DebuggerOverlay } = require("./debugger/debuggerOverlay.js");
const { OptionsOverlay } = require("./options/optionsOverlay.js");
const { InspectorOverlay } = require("./inspector/inspectorOverlay.js");

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

    // Iterate list of specified overlays and apply them
    // on existing panels.
    var overlays = [
      {id: "webconsole", ctor: ConsoleOverlay},
      {id: "jsdebugger", ctor: DebuggerOverlay},
      {id: "options", ctor: OptionsOverlay},
      {id: "inspector", ctor: InspectorOverlay},
    ];

    for (let overlay of overlays)
      this.applyOverlay(overlay);
  },

  applyOverlay: function(overlay) {
    // When an existing toolbox panel is initializing apply overlay.
    gDevTools.once(overlay.id + "-init", (eventId, toolbox, panelFrame) => {
      try {
        // Create instance of an overlay
        let instance = new overlay.ctor({
          panelFrame: panelFrame,
          toolbox: toolbox,
        });

        // Register for 'built' event (panel instance created).
        toolbox.once(overlay.id + "-build", (eventId, panel) => {
          instance.onBuild({toolbox: toolbox, panel: panel});
        });

        // Register for 'ready' event (panel frame loaded).
        toolbox.once(overlay.id + "-ready", (eventId, panel) => {
          instance.onReady({toolbox: toolbox, panel: panel});
        });
      }
      catch (err) {
        Trace.sysout("chrome.initialize; Overlay for: " + overlay.id +
          " EXCEPTION " + err, err);
      }
    });
  },

  /**
   * Executed by the framework when Firebug is destroyed.
   * I happens when the entire extension is disabled, unloaded or
   * removed.
   */
  shutdown: function(reason) {
    Trace.sysout("firebug.shutdown; " + reason);
  },

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
