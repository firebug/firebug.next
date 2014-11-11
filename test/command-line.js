/* See license.txt for terms of usage */

"use strict";

const { Firebug } = require("../lib/index.js");
const { defer } = require("sdk/core/promise");

/**
 * Executes JS expression on the Command Line or in the Command Editor.
 *
 * xxxHonza: TODO description
 *
 * @param {Toolbox} toolbox
 * @param {String} expr
 * @param {Object} config
 */
function executeCommand(toolbox, expr, config) {
  let chrome = Firebug.getChrome(toolbox);
  let consoleOverlay = chrome.getOverlay("webconsole");
  let jsterm = consoleOverlay.getTerminal();

  // The result promise.
  let deferred = defer();

  // Execute given expression in the terminal.
  // xxxHonza: TODO execute the expression in the command editor
  // if the config says so.
  jsterm.execute(expr, msg => {
    deferred.resolve(msg);
  });

  return deferred.promise;
};

// Exports from this module
exports.executeCommand = executeCommand;
