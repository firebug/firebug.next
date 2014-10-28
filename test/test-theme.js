/* See license.txt for terms of usage */

"use strict";

const { loadFirebug } = require("./common.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

exports["test Firebug theme"] = function(assert) {
  let browser = getMostRecentBrowserWindow();

  loadFirebug();

  let theme = browser.gDevTools.getThemeDefinition("firebug");
  assert.ok(theme, "The Firebug theme must exist!");
};

require("sdk/test").run(exports);
