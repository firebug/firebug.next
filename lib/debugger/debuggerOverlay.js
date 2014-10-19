/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { Win } = require("../core/window.js");
const { ToggleSideBarButton } = require("../chrome/toggleSideBarButton.js");

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

  // Side Panels

  hasSidePanels: function() {
    return true;
  },

  toggleSidebar: function() {
    let win = this.getPanelWindow();
    win.DebuggerView.toggleInstrumentsPane({
      visible: win.DebuggerView.instrumentsPaneHidden,
      animated: false,
      delayed: false
    });
  },

  isSidebarOpened: function() {
    let win = this.getPanelWindow();
    return !win.DebuggerView.instrumentsPaneHidden;
  },

  // Theme

  onApplyTheme: function(iframeWin, oldTheme) {
    Trace.sysout("debuggerOverlay.onApplyTheme; old theme: " +
      oldTheme, iframeWin);

    // Load Debugger panel stylesheets.
    loadSheet(iframeWin, "chrome://firebug/skin/debugger.css", "author");

    // Apply Firebug specific attributes on CodeMirror instance
    getCodeMirrorDoc(iframeWin, (doc) => {
      let body = doc.querySelector(".CodeMirror");
      let html = doc.getElementsByTagName("html")[0];

      html.classList.add("theme-firebug");
      html.classList.add("cm-s-firebug");
      html.classList.remove("theme-light");
      body.classList.remove("cm-s-mozilla");
    });

    // Create side bar toggle button
    Win.loaded(iframeWin).then(doc => {
      this.toggleSideBar = new ToggleSideBarButton({
        panel: this,
        toolbar: doc.getElementById("debugger-toolbar"),
      });
    });

    // Move the Callstack panel to the right sidebar
    let win = this.getPanelWindow();
    Win.domContentLoaded(win).then(doc => {
      let tab = doc.getElementById("callstack-tab");
      let panel = doc.getElementById("callstack-tabpanel");

      let sidebar = doc.getElementById("instruments-pane");
      sidebar.tabs.appendChild(tab);
      sidebar.tabpanels.appendChild(panel);
    });
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Trace.sysout("debuggerOverlay.onUnapplyTheme; new theme: " +
      newTheme, iframeWin);

    removeSheet(iframeWin, "chrome://firebug/skin/debugger.css", "author");

    getCodeMirrorDoc(iframeWin, doc => {
      let html = doc.getElementsByTagName("html")[0];

      html.classList.remove("theme-firebug");
      html.classList.remove("cm-s-firebug");
    });

    this.toggleSideBar.destroy();

    // Move the Callstack panel back to the left sidebar.
    let win = this.getPanelWindow();
    Win.domContentLoaded(win).then(doc => {
      let tab = doc.getElementById("callstack-tab");
      let panel = doc.getElementById("callstack-tabpanel");

      let sidebar = doc.getElementById("sources-pane");
      sidebar.tabs.appendChild(tab);
      sidebar.tabpanels.appendChild(panel);
    });
  },

  // Options

  /**
   * The debugger panel uses the original popup menu already
   * populated with all options since its XUL structure is
   * wired with the JS logic. See: devtools/debugger/debugger.xul
   *
   * xxxHonza: what if the original menu ID changes? TESTME
   */
  getOptionsMenuPopup: function() {
    let doc = this.getPanelDocument();
    return doc.getElementById("debuggerPrefsContextMenu");
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
