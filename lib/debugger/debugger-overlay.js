/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { Cu, Ci } = require("chrome");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");
const { Win } = require("firebug.sdk/lib/core/window.js");

// Firebug.next
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");
const { Theme } = require("../chrome/theme.js");
const { DebuggerSearch } = require("./debugger-search.js");

/**
 * @overlay This object is responsible for {@Debugger} panel customization.
 * Part of the customization is loading Firebug styles into CodeMirror
 * script editor.
 */
const DebuggerOverlay = Class(
/** @lends DebuggerOverlay */
{
  extends: PanelOverlay,

  overlayId: "jsdebugger",
  searchable: true,

  onReady: function(options) {
    PanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("debuggerOverlay.onReady;", options);

    if (Theme.isFirebugActive()) {
      this.updatePrettyPrintButton(true);
    }
  },

  destroy: function() {
    PanelOverlay.prototype.destroy.apply(this, arguments);

    if (this.searchHook) {
      this.searchHook.destroy();
    }
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

  // Theme

  onApplyTheme: function(iframeWin, oldTheme) {
    PanelOverlay.prototype.onApplyTheme.apply(this, arguments);

    Trace.sysout("debuggerOverlay.onApplyTheme; old theme: " +
      oldTheme, iframeWin);

    // Load Debugger panel stylesheets.
    loadSheet(iframeWin, "chrome://firebug/skin/debugger.css", "author");
    // #290: Make sure the delete watch expression buttons are displayed
    // (with the effects when hovering / activating them).
    loadSheet(iframeWin, "chrome://firebug/skin/variables-view.css", "author");

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

      this.updatePrettyPrintButton(true);
    });
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    PanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    Trace.sysout("debuggerOverlay.onUnapplyTheme; new theme: " +
      newTheme, iframeWin);

    removeSheet(iframeWin, "chrome://firebug/skin/debugger.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/variables-view.css", "author");

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

      this.updatePrettyPrintButton(false);
    });
  },

  // Search

  // Fix styling of pretty-print button
  // See https://bugzil.la/1068381
  updatePrettyPrintButton: function(apply) {
    if (apply) {
      let doc = this.getPanelDocument();
      let prettyPrintButton = doc.getElementById("pretty-print");
      if (prettyPrintButton.hasAttribute("text-as-image")) {
        prettyPrintButton.classList.remove("devtools-monospace");
        prettyPrintButton.removeAttribute("label");
      }
    } else {
      let doc = this.getPanelDocument();
      let prettyPrintButton = doc.getElementById("pretty-print");
      if (prettyPrintButton.hasAttribute("text-as-image")) {
        prettyPrintButton.setAttribute("label", "{}");
        prettyPrintButton.classList.add("devtools-monospace");
      }
    }
  },

  updateSearchBox: function(apply) {
    // The search box can be updated only when the panel is properly set.
    // This might happen when onApplyTheme is executed by the framework
    // and it's covered by additional execution of 'updateSearchBox'
    // in 'onReady'.
    if (!this.panel) {
      return;
    }

    Win.loaded(this.toolbox.doc.defaultView).then(() => {
      if (apply) {
        if (!this.searchHook) {
          let doc = this.getPanelDocument();

          // Copy search box value from the original search box.
          let searchInput = doc.querySelector(".devtools-searchinput");
          let overlay = this.chrome.getOverlay(this.toolbox,
            "FirebugToolboxOverlay");

          overlay.searchBox.setValue(searchInput.value);
          this.searchHook = new DebuggerSearch({overlay: this});
        }
      } else {
        if (this.searchHook) {
          this.searchHook.destroy();
          this.searchHook = null;
        }
      }
    });
  },

  onSearch: function(value) {
    this.search(".devtools-searchinput", value);
  },

  // Options

  /**
   * The debugger panel uses the original popup menu already
   * populated with all options since its XUL structure is
   * wired with the JS logic. See: devtools/client/debugger/debugger.xul
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
  if (iframe) {
    return new Promise(resolve => resolve(iframe));
  }

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
