/* See license.txt for terms of usage */

"use strict";

const { openToolbox } = require("./common.js");
const { executeCommand } = require("./command-line.js");
const { waitForMessage } = require("./console.js");

/**
 * This test is intended for performance timing support.
 * It opens the toolbox, selects the Console panel and
 * executes 'window.performance.timing' expression on
 * the command line. It consequently waits till the
 * timing visualization appears in the Console panel.s
 */
exports["test Firebug theme"] = function(assert, done) {
  // Configuration flags for toolbox open.
  let config = {
    panelId: "webconsole",
  };

  // Start HTTP server, open new tab and the toolbox.
  openToolbox(config).then(({toolbox, cleanUp}) => {
    // Execute an expression on the command line.
    let expr = "window.performance.timing";
    executeCommand(toolbox, expr).then(result => {
      // Wait for performance timing log.
      let config = {cssSelector: ".perfTimingTable"};
      waitForMessage(toolbox, config).then(result => {
        assert.ok(true, "Performance timing visualization created");
        cleanUp(done);
      });
    });
  });
};

require("sdk/test").run(exports);
