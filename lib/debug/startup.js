/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

const START_PAGE =
  //"http://10.0.3.108:7357/";
  //"http://legoas/firebug.next/simple-log.html";
  "http://legoas/src/github.com/firebug/manual-tests/console/joes-original/test.html";

function start() {
  let browser = getMostRecentBrowserWindow();

  // Open a new browser tab.
  let newTab = openTab(browser, START_PAGE, {
    inBackground: false
  });

  // Wait till the tab is loaded.
  function onPageLoad() {
    newTab.removeEventListener("load", onPageLoad, true);

    Trace.sysout("startup.start; onPageLoad", arguments);

    // Get debugging target for the new tab, open the toolbox and
    // select a tab by default.
    let target = devtools.TargetFactory.forTab(newTab);
    let panelId = "webconsole";
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      let panel = toolbox.getCurrentPanel();

      Trace.sysout("startup.start; toolbox ready");
    });
  }

  newTab.addEventListener("load", onPageLoad, true);
}

exports.start = start;