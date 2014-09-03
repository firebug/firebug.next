/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { Win } = require("../core/window.js");

const PREF_AUTO_PRETTY_PRINT = "devtools.debugger.auto-pretty-print";
const PREF_PAUSE_ON_EXCEPTIONS = "devtools.debugger.pause-on-exceptions";
const PREF_IGNORE_CAUGHT_EXCEPTIONS = "devtools.debugger.ignore-caught-exceptions";
const PREF_PANES_ON_STARTUP = "devtools.debugger.ui.panes-visible-on-startup";
const PREF_ONLY_ENUMERABLE_PROPERTIES = "devtools.debugger.ui.variables-only-enum-visible";
const PREF_VARIABLES_FILTER_BOX = "devtools.debugger.ui.variables-searchbox-visible";
const PREF_ORIGINAL_SOURCES = "devtools.debugger.source-maps-enabled";
const PREF_AUTOMATICALLY_BLACKBOX_MINIFIED_SOURCES = "devtools.debugger.auto-black-box";

Cu.import("resource://gre/modules/Services.jsm");

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
  },

  destroy: function() {
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    Trace.sysout("debuggerOverlay.onApplyTheme; old theme: " +
      oldTheme, iframeWin);

    // Apply Firebug specific attributes on CodeMirror instance
    getCodeMirrorDoc(iframeWin, (doc) => {
      let body = doc.querySelector(".CodeMirror");
      let html = doc.getElementsByTagName("html")[0];

      html.classList.add("theme-firebug");
      html.classList.add("cm-s-firebug");
      html.classList.remove("theme-light");
      body.classList.remove("cm-s-mozilla");
    });

    // Load Debugger panel stylesheets.
    loadSheet(iframeWin, "chrome://firebug/skin/jsdebugger.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Trace.sysout("debuggerOverlay.onUnapplyTheme; new theme: " +
      newTheme, iframeWin);

    getCodeMirrorDoc(iframeWin, doc => {
      let html = doc.getElementsByTagName("html")[0];

      html.classList.remove("theme-firebug");
      html.classList.remove("cm-s-firebug");
    });

    removeSheet(iframeWin, "chrome://firebug/skin/jsdebugger.css", "author");
  },

  // Options
  getOptionsMenuItems: function() {
    let items = [];

    items.push({
      id: "auto-pretty-print",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_AUTO_PRETTY_PRINT),
      label: "autoPrettifyMinifiedSources.label",
      accesskey: "autoPrettifyMinifiedSources.accesskey",
      command: this.panel._view.Options._toggleAutoPrettyPrint
    });

    items.push({
      id: "pause-on-exceptions",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_PAUSE_ON_EXCEPTIONS),
      label: "pauseOnExceptions.label",
      accesskey: "pauseOnExceptions.accesskey",
      command: this.panel._view.Options._togglePauseOnExceptions
    });

    items.push({
      id: "ignore-caught-exceptions",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_IGNORE_CAUGHT_EXCEPTIONS),
      label: "ignoreCaughtExceptions.label",
      accesskey: "ignoreCaughtExceptions.accesskey",
      command: this.panel._view.Options._toggleIgnoreCaughtExceptions
    });

    items.push({
      id: "show-panes-on-startup",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_PANES_ON_STARTUP),
      label: "showPanesOnStartup.label",
      accesskey: "showPanesOnStartup.accesskey",
      command: this.panel._view.Options._toggleShowPanesOnStartup
    });

    items.push({
      id: "show-vars-only-enum",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_ONLY_ENUMERABLE_PROPERTIES),
      label: "showOnlyEnumerableProperties.label",
      accesskey: "showOnlyEnumerableProperties.accesskey",
      command: this.panel._view.Options._toggleShowVariablesOnlyEnum
    });

    items.push({
      id: "show-vars-filter-box",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_VARIABLES_FILTER_BOX),
      label: "showVariablesFilterBox.label",
      accesskey: "showVariablesFilterBox.accesskey",
      command: this.panel._view.Options._toggleShowVariablesFilterBox
    });

    items.push({
      id: "show-original-source",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_ORIGINAL_SOURCES),
      label: "showOriginalSources.label",
      accesskey: "showOriginalSources.accesskey",
      command: this.panel._view.Options._toggleShowOriginalSource
    });

    items.push({
      id: "auto-black-box",
      type: "checkbox",
      checked: Services.prefs.getBoolPref(PREF_AUTOMATICALLY_BLACKBOX_MINIFIED_SOURCES),
      label: "automaticallyBlackBoxMinifiedSources.label",
      accesskey: "automaticallyBlackBoxMinifiedSources.accesskey",
      command: this.panel._view.Options._toggleAutoBlackBox
    });

    return items;
  },

});

// Helpers

/**
 * Returns CodeMirror's document as soon as available.
 */
function getCodeMirrorDoc(iframeWin, callback) {
  // Wait till panel iframe is loaded
  Win.loaded(iframeWin).then(doc => {
    let editorBox = doc.getElementById("editor");

    // Wait till the CM iframe is appended into the editor box.
    iframeAdded(editorBox).then(cmFrame => {
      // Wait till the CM iframe is loaded.
      Win.loaded(cmFrame.contentWindow).then(callback);
    });
  });
}

/**
 * Wait till an iframe element is added into the specified element
 * xxxHonza: could be generalized into a shared function?
 *
 * @param {Element} parentNode The parent element where the iframe will be
 * appended to.
 */
function iframeAdded(parentNode) {
  let iframe = parentNode.querySelector("iframe");
  if (iframe)
    return new Promise(resolve => resolve(iframe));

  return new Promise(resolve => {
    const { MutationObserver } = parentNode.ownerDocument.defaultView;
    const observer = new MutationObserver(mutations => {
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes || []) {
          if (node.tagName == "iframe") {
            observer.disconnect();
            resolve(node);
          }
        }
      }
    });
    observer.observe(parentNode, {childList: true});
  });
};

// Exports from this module
exports.DebuggerOverlay = DebuggerOverlay;
