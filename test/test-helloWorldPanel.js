/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { Trace, TraceError } = require("./core/trace.js").get(module.id);

// Import 'devtools' object
Cu.import("resource://gre/modules/devtools/Loader.jsm")

exports["test helloWorldPanel (async)"] = function(assert, done) {
  let browser = getMostRecentBrowserWindow();

  // Open a new browser tab.
  // xxxHonza: use proper test page URL FIX ME
  let url = "https://getfirebug.com/tests/head/console/api/log.html";
  let newTab = openTab(browser, url, {
    inBackground: false
  });

  // Wait till the tab is loaded.
  // xxxHonza: there is a lot of logs in the console:
  // Bug 1022658 - Heavy logging in the console slows down unit test execution
  var tabBrowser = getBrowserForTab(newTab);
  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);

    var panelId = "dev-panel-firebug-nextjetpack-helloWorldPanelTitle";
    var tool = browser.gDevTools.getToolDefinition(panelId);
    assert.ok(tool, "Hello World tool must exists!");

    // Get debugging target for the new tab.
    let target = devtools.TargetFactory.forTab(newTab);

    // Open toolbox with the Hello World panel selected
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      var panel = toolbox.getCurrentPanel();

      assert.ok(panel.id == panelId, "Hello World panel is loaded!");

      closeTab(newTab);
      done();
    }).then(null, console.error);
  }

  tabBrowser.addEventListener("load", onPageLoad, true);
};

require("sdk/test").run(exports);
