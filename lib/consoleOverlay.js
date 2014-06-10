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
    Trace.sysout("console.initialize;", options);

    let panel = options.panel;
    let doc = panel._frameWindow.frameElement.contentDocument;
    let win = doc.getElementById("devtools-webconsole");

    win.classList.add("theme-firebug");
    win.classList.remove("theme-light");

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
