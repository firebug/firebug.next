/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

function CommandController(chrome) {
  this.chrome = chrome;
}

/**
 * This object represents browser window controller that can be used
 * to override various browser commands.
 */
CommandController.prototype = {
/** @lends CommandController */

  supportsCommand: function(command) {
    return this.isCommandEnabled(command);
  },

  isCommandEnabled: function(command) {
    switch (command) {
      case "cmd_find":
        return true;
    }

    return false;
  },

  doCommand: function(command) {
    switch (command) {
      case "cmd_find":
        this.chrome.searchBox.focus();
        break;
    }
  }
};

// Exports from this module
exports.CommandController = CommandController;
