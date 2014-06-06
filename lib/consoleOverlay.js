/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./consoleListener.js");

/**
 *
 */
var ConsoleOverlay =
{
  initialize: function(toolbox, panel) {
    Trace.sysout("console.initialize;");

    let doc = panel._frameWindow.frameElement.contentDocument;
    let win = doc.getElementById("devtools-webconsole");

    Trace.sysout("Web console ready ", panel);

    win.classList.add("theme-firebug");
    win.classList.remove("theme-light");

    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/webconsole.css"), "author");
    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/toolbars.css"), "author");

    ConsoleListener.initialize(toolbox);
  },

  destroy: function() {
    ConsoleListener.destroy();
  },
}

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
