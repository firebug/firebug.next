/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");

/**
 * This object is responsible for {@Debugger} panel customization.
 * Part of the customization is loading Firebug styles into CodeMirror
 * script editor.
 */
const DebuggerOverlay = Class(
/** @lends DebuggerOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    Trace.sysout("debuggerOverlay.initialize;", options);
  },

  onReady: function(options) {
    Trace.sysout("debuggerOverlay.onReady;", options);

    let panel = options.panel;
    let doc = panel.panelWin.document;
    let win = doc.documentElement;

    // xxxHonza: Theme light should be removed eventually
    //win.classList.remove("theme-light");
    win.classList.add("theme-firebug");

    let debuggerStylesUrl = "chrome://firebug/skin/jsdebugger.css";
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
    let cmStylesUrl = "chrome://firebug/skin/codemirror-firebug.css";
    loadSheet(cmWin, cmStylesUrl, "author");
  },

  destroy: function() {
  },
});

// Exports from this module
exports.DebuggerOverlay = DebuggerOverlay;
