/* See license.txt for terms of usage */

"use strict";

const { loadFirebug } = require("./common.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

/**
 * This test checks existence of the Firebug theme.
 */
exports["test Firebug theme"] = function(assert, done) {
  let browser = getMostRecentBrowserWindow();

  loadFirebug().then(() => {
    let theme = browser.gDevTools.getThemeDefinition("firebug");
    assert.ok(theme, "The Firebug theme must exist!");
    done();
  });
};

require("sdk/test").run(exports);
  