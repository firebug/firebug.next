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
    BaseOverlay.prototype.initialize.apply(this, arguments);
    Trace.sysout("debuggerOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("debuggerOverlay.onReady;", options);

    // Load Debugger panel stylesheets.
    let win = this.panel.panelWin;
    loadSheet(win, "chrome://firebug/skin/jsdebugger.css", "author");
  },

  destroy: function() {
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    if (iframeWin.location.href.indexOf("debugger.xul") == -1)
      return;

    Trace.sysout("debuggerOverlay.onApplyTheme; old theme: " +
      oldTheme, iframeWin);

    let doc = iframeWin.document;
    let editorBox = doc.getElementById("editor");
    let cmFrame = editorBox.getElementsByTagName("iframe")[0];
    let cmDoc = cmFrame.contentDocument;
    let cmBody = cmDoc.querySelector(".CodeMirror");
    let cmHtml = cmDoc.getElementsByTagName("html")[0];

    if (newTheme == "firebug") {
      cmHtml.classList.add("theme-firebug");
      cmHtml.classList.add("cm-s-firebug");
      cmHtml.classList.remove("theme-light");
      cmBody.classList.remove("cm-s-mozilla");
    }
    else if (oldTheme) {
      cmHtml.classList.remove("theme-firebug");
      cmHtml.classList.remove("cm-s-firebug");
    }
  },
});

// Exports from this module
exports.DebuggerOverlay = DebuggerOverlay;
