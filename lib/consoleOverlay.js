/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./consoleListener.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

/**
 * This object is responsible for {@WebConsole} panel customization
 */
const ConsoleOverlay = Class({
/** @lends ConsoleOverlay */
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("consoleOverlay.initialize;", options);

    let panel = options.panel;
    let doc = panel._frameWindow.frameElement.contentDocument;
    let win = doc.getElementById("devtools-webconsole");

    // xxxHonza: don't remove the light theme for now (to make all
    // icons properly visible). But we need to remove it as soon
    // as Firebug Console panel theme is done.
    //win.classList.remove("theme-light");
    win.classList.add("theme-firebug");

    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/webconsole.css"), "author");
    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/toolbars.css"), "author");

    this.listener = new ConsoleListener(options);
  },

  destroy: function() {
    this.listener.destroy();
  },
});

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
