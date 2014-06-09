/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { Chrome } = require("./chrome.js");

// Extension modules
require("./helloWorldPanel.js");
require("./pageContextMenu.js");
require("./toolbarButton.js");
require("./windowWatcher.js");

// Map of all existing Chrome instances (= Toolbox instances)
var chromes = new Map();

/**
 * This object represents the main Firebug application object. Firebug
 * object is a singleton and there is one instance shared across all
 * browser windows.
 */
const Firebug = Class({
  extends: EventTarget,

  /**
   * Firebug initialization.
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
  updateOption: function() {
    Trace.sysout("firebug.updateOption; ", arguments);
  },

  // Registration methods
  registerPanel: function(panel) {
    // TODO: panel registration
  }
});

// Exports from this module
exports.Firebug = Firebug;
