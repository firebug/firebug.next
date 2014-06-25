/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./core/trace.js");
const { extend } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { Chrome } = require("./chrome.js");
const { emit } = require("sdk/event/core");

// All top level modules should be required here.
require("./pageContextMenu.js");
require("./toolbarButton.js");
require("./windowWatcher.js");
require("./dom/domPanel.js");

// Reps
require("./reps/grip.js");
require("./reps/document.js");
require("./reps/element.js");
require("./reps/object-with-url.js");

// Hello World (will be removed at some point)
require("./helloWorld/helloWorldPanel.js");

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
  },

  /**
   * Executed by the framework when Firebug is destroyed
   * i.e. the entire extension is disabled, unloaded or
   * removed.
   */
  shutdown: function(reason) {
    Trace.sysout("firebug.shutdown; " + reason);
  },

  /**
   * Executed by the framework when {@Toolbox} is ready to use. There is
   * one instance of the {@Toolbox} per browser window.
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

  // Registration methods
  registerPanel: function(panel) {
    // TODO: panel registration
  }
});

// Exports from this module
exports.Firebug = Firebug;
