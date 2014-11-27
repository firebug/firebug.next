/* See license.txt for terms of usage */

"use strict";

const { openToolbox, closeToolbox } = require("./common.js");
const { Theme } = require("../lib/chrome/theme.js");
const { Firebug } = require("../lib/index.js");
const { StartButton } = require("../lib/chrome/startButton.js");

/**
 * Test for panel tabs customization. Firebug theme removes 'flex' attribute
 * from all tabs and reverts when deactivated. Make sure the logic works
 * as expected.
 */
exports["test Start Button"] = function(assert, done) {
  let config = {
    url: "about:blank",
  };

  openToolbox(config).then(({toolbox, closeToolbox}) => {
    let chrome = Firebug.getChrome(toolbox);
    let browserDoc = chrome.getBrowserDoc();

    let button = StartButton.getButton(browserDoc);
    let active = button.getAttribute("active");
    assert.equal(active, "true", "The start button must be active now");

    closeToolbox(toolbox).then(({cleanUp}) => {
      let active = button.getAttribute("active");
      assert.ok(!active, "The start button must be deactivated now");
      cleanUp(done);
    });
  });
};

require("sdk/test").run(exports);
