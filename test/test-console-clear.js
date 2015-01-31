/* See license.txt for terms of usage */

"use strict";

const { waitForMessage } = require("./console.js");
const { getToolboxWhenReady } = require("./toolbox.js");
const { startServer, stopServer } = require("./httpd.js");
const { closeTab } = require("./window.js");

// Content of the test page (one console log is coming from the content).
const content =
  "<html><head><meta charset=\"UTF-8\"/></head><body><script>" +
  "console.log('hello')" +
  "</script></body></html>";

/**
 * This test check the Clear action and existence of the Clear button that
 * is available on the Console panel. It opens the toolbox, selects the
 * Console panel and wait for incoming log. As soon as the log arrives it
 * clears the console and checks that it's empty.
 */
exports["test Console clear button"] = function(assert, done) {
  // Start HTTP server
  let {server, url} = startServer({
    pageContent: content
  });

  // Open the toolbox on our test page.
  getToolboxWhenReady(url, "webconsole").then(({toolbox, overlay, tab}) => {
    assert.ok(overlay, "The Console panel must be overlaid");

    let doc = overlay.getPanelDocument();
    let clearButton = doc.querySelector(".webconsole-clear-console-button");
    assert.ok(clearButton, "The clear button must exist");

    // Wait for console log.
    let config = {
      cssSelector: ".message[category=console] .console-string"
    };

    waitForMessage(toolbox, config).then(result => {
      assert.ok(true, "There must not be a log in the Console panel");

      overlay.clearConsole();

      let log = doc.querySelector(config.cssSelector);
      assert.ok(!log, "There must not be a log in the Console panel");

      // Close the tab an stop HTTP server.
      closeTab(tab);
      stopServer(server, done);
    });
  });
};

require("sdk/test").run(exports);
