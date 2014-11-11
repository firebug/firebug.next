/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { openToolbox } = require("./common.js");
const { waitForMessage } = require("./console.js");

// Content of the test page (one console log is coming from the content).
const content =
  "<html><head></head><body><script>" +
  "console.log('hello')" +
  "</script></body></html>";

exports["test Console clear button"] = function(assert, done) {
  // Configuration flags for toolbox opening.
  let config = {
    panelId: "webconsole",
    pageContent: content
  };

  // Start HTTP server, open new tab and the toolbox.
  openToolbox(config).then(({toolbox, cleanUp, overlay}) => {
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

      cleanUp(done);
    });
  });
};

require("sdk/test").run(exports);
