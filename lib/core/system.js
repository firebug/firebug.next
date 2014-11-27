/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const currentBrowserVersion = Services.appinfo.platformVersion;

let System = {};

/**
 * Compare the current browser version with the provided version argument.
 *
 * @param version string to compare with.
 * @returns {Integer} Possible result values:
 * is smaller than 0, the current version < version 
 * equals 0 then the current version == version
 * is bigger than 0, then the current version > version
 */
System.compare = function(version) {
  return Services.vc.compare(currentBrowserVersion, version);
}

/**
 * Returns true if the current browser version is equal or bigger than
 * the giver version. The version can be specified as a string or number.
 *
 * @param version {String|Number} string that must correspond
 * to the version format. Read the following pages:
 * https://developer.mozilla.org/en/docs/Toolkit_version_format
 * https://addons.mozilla.org/en-US/firefox/pages/appversions/
 * The version can be also specified as a simple number that is converted
 * to the version string.
 *
 * @returns {Boolean} True if the current browser version is equal or bigger.
 */
System.versionIsAtLeast = function(version) {
  if (typeof version == "number") {
    version = version + ".0a1";
  }

  return System.compare(version) >= 0;
}

/**
 * Returns true if the current browser comes from Developer Edition channel
 * (formerly Aurora).
 */
System.isDeveloperBrowser = function() {
  try {
    let value = Services.prefs.getCharPref("app.update.channel");

    // xxxHonza: "nightly-gum" can be removed at some point.
    return (value == "aurora") || (value == "nightly-gum");
  }
  catch (err) {
    // Exception is thrown when the preference doesn't exist
  }

  return false;
}

/**
 * Returns true if the current browser supports multiprocess feature
 * (known also as Electrolysis & e10s)
 */
System.isMultiprocessEnabled = function(browserDoc) {
  if (Services.prefs.getBoolPref("browser.tabs.remote.autostart")) {
    return true;
  }

  if (Services.prefs.getBoolPref("browser.tabs.remote.autostart.1")) {
    return true;
  }

  if (browserDoc) {
    let browser = browserDoc.getElementById("content");
    if (browser && browser.mCurrentBrowser.isRemoteBrowser) {
      return true;
    }
  }

  let browser = getMostRecentBrowserWindow();
  if (browser && browser.gBrowser.isRemoteBrowser) {
    return true;
  }

  return false;
}

/**
 * Safe require for devtools modules.
 */
System.devtoolsRequire = function(uri) {
  try {
    return devtools["require"](uri);
  } catch (err) {
    return {};
  }
}

// Exports from this module
exports.System = System;
