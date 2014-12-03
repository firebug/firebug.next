/* See license.txt for terms of usage */

"use strict";

const { main, Firebug } = require("../lib/index.js");
const { openToolbox, closeToolbox } = require("dev/utils");
const { defer } = require("sdk/core/promise");
const { serve, host } = require("./httpd.js");
const { closeTab } = require("sdk/tabs/utils");
const { setTimeout } = require("sdk/timers");
const { openBrowserTab, waitForPageLoad } = require("./window.js");

/**
 * xxxHonza: design this API as asynchronous
 * TODO: description
 */
function loadFirebug() {
  let deferred = defer();

  if (!Firebug.chromes) {
    Firebug.target.once("initialized", () => {
      deferred.resolve();
    });

    main({loadReason: "install"});
  } else {
    deferred.resolve();
  }

  return deferred.promise;
};

// Exports from this module
exports.loadFirebug = loadFirebug;
