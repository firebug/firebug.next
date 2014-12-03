/* See license.txt for terms of usage */

"use strict";

const { executeCommand } = require("./command-line.js");
const { waitForMessage } = require("./console.js");
const { getToolboxWhenReady } = require("./toolbox.js");
const { startServer, stopServer } = require("./httpd.js");
const { closeTab } = require("./window.js");

/**
 * This test is intended for performance timing support.
 * It opens the toolbox, selects the Console panel and
 * executes 'window.performance.timing' expression on
 * the command line. It consequently waits till the
 * timing visualization appears in the Console panel.
 */
exports["test Firebug theme"] = function(assert, done) {
  // Start HTTP server and open new tab and the toolbox on the test page.
  let {server, url} = startServer();
  getToolboxWhenReady(url, "webconsole").then(({toolbox, tab}) => {
    // Execute an expression on the command line.
    let expr = "window.performance.timing";
    executeCommand(toolbox, expr).then(result => {
      // Wait for performance timing log.
      let config = {cssSelector: ".perfTimingTable"};
      waitForMessage(toolbox, config).then(result => {
        assert.ok(true, "Performance timing visualization created");

        // Close the tab an stop HTTP server.
        closeTab(tab);
        stopServer(server, done);
      });
    });
  });
};

require("sdk/test").run(exports);
