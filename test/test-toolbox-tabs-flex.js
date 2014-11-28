/* See license.txt for terms of usage */

"use strict";

const { openToolbox } = require("./common.js");
const { Theme } = require("../lib/chrome/theme.js");

/**
 * Test for panel tabs customization. Firebug theme removes 'flex' attribute
 * from all tabs and reverts when deactivated. Make sure the logic works
 * as expected.
 */
exports["test Toolbox Tab Flex"] = function(assert, done) {
  let config = {
    panelId: "webconsole",
  };

  openToolbox(config).then(({toolbox, cleanUp}) => {
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

    cleanUp(done);
  });
};


require("sdk/test").run(exports);
