/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

// Import 'devtools' object
Cu.import("resource://gre/modules/devtools/Loader.jsm")

const START_PAGE =
  "https://getfirebug.com/tests/manual/console/joes-original/test.html";

function start() {
  let browser = getMostRecentBrowserWindow();

  // Open a new browser tab.
  let newTab = openTab(browser, START_PAGE, {
    inBackground: false
  });

  // Wait till the tab is loaded.
  let tabBrowser = getBrowserForTab(newTab);
  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);

    // Get debugging target for the new tab, open the toolbox and
    // select a tab by default.
    let target = devtools.TargetFactory.forTab(newTab);
    let panelId = "webconsole";
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      let panel = toolbox.getCurrentPanel();

      Trace.sysout("startup.start; toolbox ready");
    });
  }

  tabBrowser.addEventListener("load", onPageLoad, true);
}

exports.start = start;