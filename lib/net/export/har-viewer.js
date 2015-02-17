/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { once } = require("sdk/dom/events.js");
const { Options } = require("../../core/options.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

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
    let viewerURL = Options.get("netexport.viewerURL");
    let result = iterateBrowserWindows("navigator:browser", (browserWin) => {
      return iterateBrowserTabs(browserWin, (tab, currBrowser) => {
        let currentUrl = currBrowser.currentURI.spec;

        // Check if the tab has HAR Viewer URL.
        if (currentUrl.indexOf(viewerURL) == 0) {
          Trace.sysout("HarViewer.open; An existing tab found: " +
            currentUrl, currBrowser);

          // Select the tab (the content might start loading at this moment
          // if the tab has been selected for the first time).
          let tabBrowser = browserWin.getBrowser();
          tabBrowser.selectedTab = tab;
          browserWin.focus();

          // If the window is loaded set HAR source and show the preview,
          // otherwise wait till the content is loaded.
          let win = currBrowser.contentWindow.wrappedJSObject;
          let sourceEditor = $("sourceEditor", win.document);
          if (sourceEditor) {
            sourceEditor.value = jsonString;
            this.click($("appendPreview", win.document));
          } else {
            browserContentLoaded(currBrowser).then(doc => {
              this.onContentLoad(doc, jsonString);
            });
          }

          return true;
        }
      })
    });

    // The viewer is not opened yet so, open a new tab.
    if (!result) {
      let tabBrowser = this.getTabBrowser();
      tabBrowser.selectedTab = tabBrowser.addTab(url);

      Trace.sysout("HarViewer.open; Open HAR Viewer tab",
        tabBrowser.selectedTab.linkedBrowser);

      let browser = tabBrowser.selectedTab.linkedBrowser;
      browserContentLoaded(browser).then(doc => {
        this.onContentLoad(doc, jsonString);
      });
    }
  },

  // Private API

  onContentLoad: function(doc, jsonString) {
    let content = $("content", doc);

    Trace.sysout("HarViewer.onContentLoad;", content);

    let onViewerInit = (event) => {
      content.removeEventListener("onViewerInit", onViewerInit, true);

      Trace.sysout("HarViewer.onViewerInit; HAR Viewer initialized");

      // Initialize input JSON box and click the preview button
      // to switch to the Preview tab.
      $("sourceEditor", doc).value = jsonString;
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

let browserContentLoaded = makeInfallible(browser => new Promise(resolve => {
  once(browser, "DOMContentLoaded", event => resolve(event.target));
}));

// xxxHonza: use SDK API to iterate all browser windows and tabs.

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
