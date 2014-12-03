/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { waitForMessage } = require("./console.js");
const { getToolboxWhenReady } = require("./toolbox.js");
const { startServer, stopServer } = require("./httpd.js");
const { closeTab } = require("./window.js");
const { System } = require("../lib/core/system.js");

const base64 = require("sdk/base64");

/**
 * This test opens the Toolbox on a page the sends server side log
 * through HTTP headers (see onServerLogging). Consequently it waits
 * till the log appears in the Console panel.
 */
exports["test Remote Logger"] = function(assert, done) {
  // The logger doesn't support e10s yet.
  if (System.isMultiprocessEnabled()) {
    assert.ok(true, "The server log isn't supported in e10s");
    done();
    return;
  }

  // Start HTTP server
  let {server, url} = startServer({
    pageName: "serverLogging",
    pathHandler: onServerLogging
  });

  // Open the toolbox and wait till it's ready.
  getToolboxWhenReady(url, "webconsole").then(({toolbox, overlay, tab}) => {
    let doc = overlay.getPanelDocument();
    let filterButton = doc.querySelector("#firebug-serverlog-filter");
    assert.ok(filterButton, "The server log filter button must exist");

    let config = {
      cssSelector: ".message[category=server] .console-string"
    };

    // Wait for a log (coming from the server) displayed in the Console panel.
    waitForMessage(toolbox, config).then(result => {
      assert.equal(result.length, 1, "There must be one output message");

      let expected = "\"Hello from the server\"";
      assert.equal(result[0].textContent, expected,
        "The log message must be : " + expected);

      // Close the tab an stop HTTP server.
      closeTab(tab);
      stopServer(server, done);
    });

    // Reload the current tab.
    toolbox.target.activeTab.reload();
  });
};

// HTTP header data for server side log.
const data = {
  "version": "1.1.1",
  "columns":["log", "backtrace","type"],
  "rows":[[["Hello from the server"], "server.js:1:12", ""]]
};

// Request handler. It puts the server side log into HTTP headers.
function onServerLogging(request, response) {
  let value = base64.encode(JSON.stringify(data));
  response.setHeader("X-ChromeLogger-Data", value, false);
  response.setHeader("Content-Type", "text/html; charset=UTF-8", false);
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.write("Hello from the server!");
}

require("sdk/test").run(exports);
