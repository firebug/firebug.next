/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { Trace } = require("./trace.js");

// Import 'devtools' object
Cu.import("resource://gre/modules/devtools/Loader.jsm")

exports["test hello world panel async"] = function(assert, done) {
  let browser = getMostRecentBrowserWindow();

  // Open a new browser tab.
  let newTab = openTab(browser, "http://google.com", {
    inBackground: false
  });

  // Wait till the tab is loaded.
  // xxxHonza: there is a lot of logs in the console:
  // Bug 1022658 - Heavy logging in the console slows down unit test execution
  var tabBrowser = getBrowserForTab(newTab);
  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);

    // Get debugging target for the new tab.
    let target = devtools.TargetFactory.forTab(newTab);
    var panelId = "pane-firebug-nextjetpack-Hello-World";

    // Open toolbox with the Hello World panel selected
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      var panel = toolbox.getCurrentPanel();

      Trace.sysout("panel loaded " + panel.id, panel);

      assert.ok(panel.id, panelId, "Hello World panel exists!");

      closeTab(newTab);
      done();
    }).then(null, console.error);
  }

  tabBrowser.addEventListener("load", onPageLoad, true);
};

require("sdk/test").run(exports);
