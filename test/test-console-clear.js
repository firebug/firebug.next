/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { loadFirebug } = require("./common.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { setTimeout } = require("sdk/timers");
const { serve, host } = require("./httpd.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

const content =
  "<html><head></head><body><script>" +
  "console.log('hello')" +
  "</script></body></html>";

exports["test Console clear button"] = function(assert, done) {
  let browser = getMostRecentBrowserWindow();

  let title = "testPage1";
  let url = host + title + ".html";
  let server = serve({ name: title, content: content });

  loadFirebug();

  let newTab = openTab(browser, url, {
    inBackground: false
  });

  let tabBrowser = getBrowserForTab(newTab);
  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);

    let panelId = "webconsole";
    let tool = browser.gDevTools.getToolDefinition(panelId);
    let target = devtools.TargetFactory.forTab(newTab);

    // Open toolbox with the Console panel selected.
    browser.gDevTools.showToolbox(target, panelId).then(function(toolbox) {
      let panel = toolbox.getCurrentPanel();

      let overlay = panel._firebugPanelOverlay;
      assert.ok(overlay, "The Console panel must be overlaid");

      let doc = overlay.getPanelDocument();
      let clearButton = doc.querySelector(".webconsole-clear-console-button");
      assert.ok(clearButton, "The clear button must exist");

      waitForMessage(panel, () => {
        let log = doc.querySelector(".message[category=console] .console-string");
        assert.ok(log, "There must be a log in the Console panel");

        overlay.clearConsole();

        log = doc.querySelector(".message[category=console] .console-string");
        assert.ok(!log, "There must not be a log in the Console panel");

        // Asynchronously clean up
        setTimeout(() => {
          server.stop(() => {
            closeTab(newTab);
            done();
          });
        })
      });
    });
  }

  tabBrowser.addEventListener("load", onPageLoad, true);
};

function waitForMessage(panel, callback) {
  let overlay = panel._firebugPanelOverlay;
  let doc = overlay.getPanelDocument();
  let log = doc.querySelector(".message[category=console] .console-string");
  if (log) {
    callback();
    return;
  }

  panel.hud.ui.once("new-messages", (event, messages) => {
    callback();
  });
}

require("sdk/test").run(exports);
