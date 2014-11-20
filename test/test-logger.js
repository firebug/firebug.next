/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { openToolbox } = require("./common.js");
const { waitForMessage } = require("./console.js");

const base64 = require("sdk/base64");

exports["test Remote Logger"] = function(assert, done) {
  // Configuration flags for toolbox opening. We want the Console panel
  // to be selected by default, page name is 'serverLogging' and the
  // request handler is implemented by 'onServerLogging' method.
  let config = {
    panelId: "webconsole",
    pageName: "serverLogging",
    pathHandler: onServerLogging
  };

  // Start HTTP server, open new tab and the toolbox.
  openToolbox(config).then(({toolbox, cleanUp, overlay, browserTab}) => {
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

      cleanUp(done);
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
