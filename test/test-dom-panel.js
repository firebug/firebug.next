/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { loadFirebug } = require("./common.js");
const { getToolDefinition, getToolboxWhenReady } = require("./toolbox.js");
const { closeTab } = require("sdk/tabs/utils");
const { setTimeout } = require("sdk/timers");
const { domPanelId } = require("../lib/dom/domPanel");

/**
 * This test checks existence of the DOM panel. It opens a new tab,
 * shows the toolbox and waits till the panel is refreshed.
 */
exports["test DOM panel"] = function(assert, done) {
  loadFirebug();

  // Open a new tab and the toolbox on it.
  getToolboxWhenReady("about:blank", domPanelId).then(({toolbox, tab}) => {
    let tool = getToolDefinition(domPanelId);
    assert.ok(tool, "The DOM tool must exist!");

    toolbox.selectTool(domPanelId).then(panel => {
      assert.ok(panel.id == domPanelId, "DOM panel is loaded!");

      // Wait till the panel is refreshed and asynchronously quit the test.
      panel.once("refreshed", function() {
        setTimeout(function() {
          closeTab(tab);
          done();
        });
      });
    });
  });
};

require("sdk/test").run(exports);
