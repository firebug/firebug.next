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
 * This object is responsible for {@WebConsole} panel customization.
 * Part of the customization is loading Firebug them into CodeMirror
 * script editor.
 */
const DebuggerOverlay = Class({
/** @lends DebuggerOverlay */
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("debuggerOverlay.initialize;", options);

    let panel = options.panel;
    let doc = panel.panelWin.document;
    let win = doc.documentElement;

    // xxxHonza: Theme light should be removed eventually
    //win.classList.remove("theme-light");
    win.classList.add("theme-firebug");

    let debuggerStylesUrl = self.data.url("firebug-theme/jsdebugger.css");
    loadSheet(panel.panelWin, debuggerStylesUrl, "author");

    // xxxHonza: we should also use common styles for toolbars.
    //loadSheet(panel.panelWin,
    //    self.data.url("firebug-theme/toolbars.css"), "author");

    // Code Mirror styling
    let editorBox = doc.getElementById("editor");
    let cmFrame = editorBox.getElementsByTagName("iframe")[0];
    let cmDoc = cmFrame.contentDocument;
    let cmWin = cmFrame.contentWindow;
    let cmBody = cmDoc.querySelector(".CodeMirror");
    let cmHtml = cmDoc.getElementsByTagName("html")[0];

    cmHtml.classList.remove("theme-light");
    cmHtml.classList.add("theme-firebug");

    cmBody.classList.remove("cm-s-mozilla");
    cmHtml.classList.add("cm-s-firebug");

    // Load CM stylesheet
    let cmStylesUrl = self.data.url("firebug-theme/codemirror-firebug.css");
    loadSheet(cmWin, cmStylesUrl, "author");
  },

  destroy: function() {
  },
});

// Exports from this module
exports.DebuggerOverlay = DebuggerOverlay;
