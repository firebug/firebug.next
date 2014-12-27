/* See license.txt for terms of usage */

"use strict";

const { Firebug } = require("../lib/index.js");
const { defer } = require("sdk/core/promise");

/**
 * Executes JS expression on the Command Line or in the Command Editor.
 *
 * @param {Toolbox} toolbox The current toolbox
 * @param {String} expr Expression to be evaluated
 * @param {Object} config Configuration flags
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
