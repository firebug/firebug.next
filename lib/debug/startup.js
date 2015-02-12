/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab, getTabBrowserForTab } = require("sdk/tabs/utils");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const prefs = require("sdk/simple-prefs");

// Provide custom page that should be opened by default.
const START_PAGE = "";

function start() {
  return;
  if (prefs["env"] == "development") {
    return;
  }

  let browser = getMostRecentBrowserWindow();
  let newTab;

  if (!START_PAGE) {
    let browser = getMostRecentBrowserWindow();
    if (browser && browser.gBrowser) {
      newTab = browser.gBrowser.selectedTab;
    }
  }

  if (!newTab && START_PAGE) {
    newTab = openTab(browser, START_PAGE, {
      inBackground: false
    });
  }

  if (!newTab) {
    return;
  }

  // Wait till the tab is loaded.
  function onPageLoad() {
    newTab.removeEventListener("load", onPageLoad, true);

    Trace.sysout("startup.start; onPageLoad", arguments);

    // Get debugging target for the new tab, open the toolbox and
    // select a tab by default.
    let target = devtools.TargetFactory.forTab(newTab);
    let panelId = "netmonitor";
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      let panel = toolbox.getCurrentPanel();

      Trace.sysout("startup.start; toolbox ready");
    });
  }

  newTab.addEventListener("load", onPageLoad, true);
}

exports.start = start;