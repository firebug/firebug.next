/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
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
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("debuggerOverlay.onReady;", options);

    // Load Debugger panel stylesheets.
    let win = this.panel.panelWin;
    loadSheet(win, "chrome://firebug/skin/jsdebugger.css", "author");
    loadSheet(win, "chrome://firebug/skin/toolbars.css", "author");

    // Load CM stylesheet
    let doc = win.document;
    let editorBox = doc.getElementById("editor");
    let cmFrame = editorBox.getElementsByTagName("iframe")[0];
    let cmWin = cmFrame.contentWindow;

    loadSheet(cmWin, "chrome://firebug/skin/codemirror-firebug.css", "author");
  },

  destroy: function() {
  },

  onSwitchTheme: function(newTheme, oldTheme) {
    Trace.sysout("debuggerOverlay.onSwitchTheme; " + newTheme + ", " + oldTheme);

    let doc = this.panel.panelWin.document;
    let win = doc.documentElement;

    let editorBox = doc.getElementById("editor");
    let cmFrame = editorBox.getElementsByTagName("iframe")[0];
    let cmDoc = cmFrame.contentDocument;
    let cmBody = cmDoc.querySelector(".CodeMirror");
    let cmHtml = cmDoc.getElementsByTagName("html")[0];

    if (newTheme == "firebug") {
      win.classList.add("theme-light");
      win.classList.add("theme-firebug");

      // xxxHonza: hack, should be removed as soon as Bug 1038562 is fixed
      loadSheet(this.panel.panelWin,
        "chrome://browser/skin/devtools/light-theme.css", "author");

      cmHtml.classList.add("theme-firebug");
      cmHtml.classList.add("cm-s-firebug");
      cmHtml.classList.remove("theme-light");
      cmBody.classList.remove("cm-s-mozilla");
    }
    else if (oldTheme) {
      win.classList.remove("theme-firebug");

      cmHtml.classList.remove("theme-firebug");
      cmHtml.classList.remove("cm-s-firebug");
    }
  },
});

// Exports from this module
exports.DebuggerOverlay = DebuggerOverlay;
