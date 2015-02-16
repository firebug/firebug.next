/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

const wm = Cc["@mozilla.org/appshell/window-mediator;1"].
  getService(Ci.nsIWindowMediator);

/**
 * TODO docs
 */
var HarViewer =
/** @lends HarViewer */
{
  // Public API

  open: function(url, jsonString) {
    let result = iterateBrowserWindows("navigator:browser", (browserWin) => {
      return iterateBrowserTabs(browserWin, (tab, currBrowser) => {
        let currentUrl = currBrowser.currentURI.spec;
        if (currentUrl.indexOf("/har/viewer") >= 0 ||
          currentUrl.indexOf("/harviewer") >= 0) {

          let tabBrowser = browserWin.getBrowser();
          tabBrowser.selectedTab = tab;
          browserWin.focus();

          let win = tabBrowser.contentWindow.wrappedJSObject;

          // xxxHonza: if the tab wasn't yet selected the content
          // isn't loaded and the sourceEditor doesn't exist.
          // Fill out the inout JSON text box.
          let sourceEditor = $("sourceEditor", win.document);
          sourceEditor.value = jsonString;

          // Click the Append Preview button.
          this.click($("appendPreview", win.document));

          Trace.sysout("netExport.openViewer; Select an existing tab",
            tabBrowser);

          return true;
        }
      })
    });

    // The viewer is not opened yet so, open a new tab.
    if (!result) {
      let tabBrowser = this.getTabBrowser();
      tabBrowser.selectedTab = tabBrowser.addTab(url);

      Trace.sysout("netExport.openViewer; Open HAR Viewer tab",
        tabBrowser.selectedTab.linkedBrowser);

      let browser = tabBrowser.selectedTab.linkedBrowser;
      let onContentLoad = (event) => {
        browser.removeEventListener("DOMContentLoaded", onContentLoad, true);
        this.onContentLoad(event, jsonString);
      }

      browser.addEventListener("DOMContentLoaded", onContentLoad, true);
    }
  },

  // Private API

  onContentLoad: function(event, jsonString) {
    let win = event.currentTarget;
    let content = $("content", win.contentDocument);

    Trace.sysout("netexport.DOMContentLoaded;", content);

    let onViewerInit = (event) => {
      content.removeEventListener("onViewerInit", onViewerInit, true);

      let doc = content.ownerDocument;
      let win = doc.defaultView.wrappedJSObject;

      Trace.sysout("netexport.onViewerInit; HAR Viewer initialized", win);

      // Initialize input JSON box.
      $("sourceEditor", doc).value = jsonString;

      // Switch to the Preview tab by clicking on the preview button.
      this.click($("appendPreview", doc));
    }

    content.addEventListener("onViewerInit", onViewerInit, true);
  },

  click: function(button) {
    let doc = button.ownerDocument;
    let event = doc.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
      false, false, false, false, 0, null);
    button.dispatchEvent(event);
  },

  getTabBrowser: function() {
    let browser = getMostRecentBrowserWindow();
    return browser.top.document.getElementById("content");
  }
};

// Helpers
// xxxHonza: use SDK API

function iterateBrowserWindows(windowType, callback) {
  let windowList = wm.getZOrderDOMWindowEnumerator(windowType, true);
  if (!windowList.hasMoreElements()) {
    windowList = wm.getEnumerator(windowType);
  }

  while (windowList.hasMoreElements()) {
    if (callback(windowList.getNext())) {
      return true;
    }
  }

  return false;
};

function iterateBrowserTabs(browserWindow, callback) {
  let tabBrowser = browserWindow.getBrowser();
  let numTabs = tabBrowser.browsers.length;

  for(let index=0; index<numTabs; index++) {
    let currentBrowser = tabBrowser.getBrowserAtIndex(index);
    if (callback(tabBrowser.mTabs[index], currentBrowser)) {
      return true;
    }
  }

  return false;
};

function $(id, doc) {
  return doc.getElementById(id);
}

// Exports from this module
exports.HarViewer = HarViewer;
