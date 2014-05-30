/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace } = require("./trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { SearchBox } = require("./searchBox.js");
const { defer } = require('sdk/core/promise');
const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");

// Extension modules
require("./helloWorldPanel.js");
require("./pageContextMenu.js");
require("./toolbarButton.js");
require("./windowWatcher.js");

/**
 * This object represents the main Firebug application object.
 * It's responsible for main initialization steps.
 */
const Firebug = Class({
  extends: EventTarget,

  // Initialization steps
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("firebug.initialize;", options);
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
   * Executed by the framework when the developer tools
   * {@Toolbox} is ready to use.
   */ 
  onToolboxReady: function(event, toolbox) {
    Trace.sysout("firebug.onToolboxReady; ", toolbox);

    var doc = toolbox.doc;
    var frame = toolbox.frame;

    var url = self.data.url("searchBox.xml");
    Trace.sysout("main.onToolboxReady; " + url, toolbox);

    var styles = [
      "toolbox.css",
      "toolbars.css",
      "buttons.css",
      "splitter.css",
      "searchbox.css",
    ];

    var win = frame.contentWindow;
    for (var style of styles) {
      var url = self.data.url("firebug-theme/" + style);
      loadSheet(win, url, "author");
    }

    doc.documentElement.classList.add("theme-firebug");

    var tabs = doc.querySelectorAll(".devtools-tab");
    for (let tab of tabs)
      tab.removeAttribute("flex");

    // Search Box
    var tabBar = doc.querySelector(".devtools-tabbar");
    var searchBox = new SearchBox({
      parentNode: tabBar,
      reference: doc.querySelector("#toolbox-controls-separator")
    });

    getPanelWhenReady(toolbox, "webconsole").then((panel) => {
      var doc = panel._frameWindow.frameElement.contentDocument;
      var win = doc.getElementById("devtools-webconsole");

      Trace.sysout("Web console ready " + win, win);

      win.classList.add("theme-firebug");
      win.classList.remove("theme-light");

      loadSheet(panel._frameWindow,
          self.data.url("firebug-theme/webconsole.css"), "author");
      loadSheet(panel._frameWindow,
          self.data.url("firebug-theme/toolbars.css"), "author");
    });
  },

  onToolboxDestroyed: function(target) {
    Trace.sysout("firebug.onToolboxDestroyed;", target);
  }
});

// Helper function, returns a panel when it's ready
function getPanelWhenReady(toolbox, id) {
  let deferred = defer();
  let panel = toolbox.getPanel(id);
  if (panel) {
    deferred.resolve(panel);
  } else {
    toolbox.once(id + "-ready", panel => {
      deferred.resolve(panel);
    });
  }
  return deferred.promise;
}

// Exports from this module
exports.Firebug = Firebug;
