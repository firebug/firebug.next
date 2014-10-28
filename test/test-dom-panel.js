/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { loadFirebug } = require("./common.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { setTimeout } = require("sdk/timers");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

exports["test DOM panel"] = function(assert, done) {
  let browser = getMostRecentBrowserWindow();

  loadFirebug();

  // Open a new browser tab.
  let url = "about:blank";
  let newTab = openTab(browser, url, {
    inBackground: false
  });

  // Wait till the tab is loaded.
  // xxxHonza: there is a lot of logs in the console:
  // Bug 1022658 - Heavy logging in the console slows down unit test execution
  let tabBrowser = getBrowserForTab(newTab);
  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);

    let panelId = "dev-panel-firebug-nextgetfirebug-com-DOM";
    let tool = browser.gDevTools.getToolDefinition(panelId);
    assert.ok(tool, "The DOM tool must exist!");

    // Get debugging target for the new tab.
    let target = devtools.TargetFactory.forTab(newTab);

    // Open toolbox with the DOM panel selected
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      let panel = toolbox.getCurrentPanel();

      assert.ok(panel.id == panelId, "DOM panel is loaded!");

      // Wait till the panel is refreshed and asynchronously quit the test.
      panel.once("refreshed", function() {
        setTimeout(function() {
          closeTab(newTab);
          done();
        });
      });
    }).then(null, console.error);
  }

  tabBrowser.addEventListener("load", onPageLoad, true);
};

require("sdk/test").run(exports);
