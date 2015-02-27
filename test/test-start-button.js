/* See license.txt for terms of usage */

"use strict";

const { StartButton } = require("../lib/chrome/start-button.js");
const { getToolboxWhenReady, closeToolbox, waitUntil } = require("./toolbox.js");
const { closeTab } = require("./window.js");

/**
 * Test for panel tabs customization. Firebug theme removes 'flex' attribute
 * from all tabs and reverts when deactivated. Make sure the logic works
 * as expected.
 */
exports["test Start Button"] = function(assert, done) {
  getToolboxWhenReady("about:blank").then(({toolbox, chrome, tab}) => {
    let browserDoc = chrome.getBrowserDoc();

    let button = StartButton.getButton(browserDoc);

    waitUntil(() => button.getAttribute("active") === "true", 5000).then(() => {
      let active = button.getAttribute("active");

      assert.equal(active, "true", "The start button must be active now");

      closeToolbox(tab).then(() => {
        let active = button.getAttribute("active");
        assert.ok(!active, "The start button must be deactivated now");

        closeTab(tab);
        done();
      });
    }, (e) => {
      assert.fail("Test timed out waiting the start button to become active");
      done();
    });
  });
};

require("sdk/test").run(exports);
