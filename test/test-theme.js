/* See license.txt for terms of usage */

"use strict";

const { main, onUnload } = require("../lib/index.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

exports["test-theme"] = function(assert) {
  let browser = getMostRecentBrowserWindow();

  main({loadReason: "install"});

  let theme = browser.gDevTools.getThemeDefinition("firebug");
  assert.ok(theme, "The Firebug theme must exist!");

  onUnload();
};

require("sdk/test").run(exports);
