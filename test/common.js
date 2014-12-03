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
 * Load Firebug add-on. Tests that only verifies specific API don't
 * have to load entire extension. However, tests that need to open the
 * toolbox and check out specific panel or another piece of the UI needs
 * to usually load entire extension.
 * 
 * @returns {Promise} Resolved when Firebug is fully initialized. This can
 * happen asynchronously (e.g. some modules might require communication
 * with the backend over RDP).
 */
function loadFirebug() {
  let deferred = defer();

  if (!Firebug.chromes) {
    Firebug.target.once("initialized", () => {
      deferred.resolve(true);
    });

    main({loadReason: "install"});
  } else {
    deferred.resolve(false);
  }

  return deferred.promise;
};

// Exports from this module
exports.loadFirebug = loadFirebug;
