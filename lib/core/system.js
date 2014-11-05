/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const curentBrowserVersion = Services.appinfo.platformVersion;

/**
 * Compare the current browser version with the provided version argument.
 *
 * @param version string to compare with.
 * @returns {Integer} Possible result values:
 * is smaller than 0, the current version < version 
 * equals 0 then the current version == version
 * is bigger than 0, then the current version > version
 */
function compare(version) {
  return Services.vc.compare(curentBrowserVersion, version);
}

// Exports from this module
exports.compare = compare;
