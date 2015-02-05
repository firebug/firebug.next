/* See license.txt for terms of usage */

"use strict";

const { getToolboxWhenReady } = require("./toolbox.js");
const { Theme } = require("../lib/chrome/theme.js");
const { closeTab } = require("./window.js");
const { setTimeout } = require("sdk/timers");

/**
 * Test for panel tabs customization. Firebug theme removes 'flex' attribute
 * from all tabs and reverts when deactivated. Make sure the logic works
 * as expected.
 */
exports["test Toolbox Tab Flex"] = function(assert, done) {
  getToolboxWhenReady("about:blank").then(({toolbox, tab}) => {
    let doc = toolbox.doc;
    let tabs = doc.querySelectorAll(".devtools-tab");

    for (let tab of tabs) {
      assert.ok(!tab.getAttribute("flex"),
        "Tabs should not use flex for Firebug theme");
    }

    Theme.setCurrentTheme("light");

    tabs = doc.querySelectorAll(".devtools-tab");
    for (let tab of tabs) {
      assert.equal(tab.getAttribute("flex"), 1,
        "Tabs should use flex for Light theme");
    }

    Theme.setCurrentTheme("firebug");

    setTimeout(function() {
      closeTab(tab);
      done();
    });
  });
};


require("sdk/test").run(exports);
