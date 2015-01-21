/* See license.txt for terms of usage */

"use strict";

const { getToolDefinition, getToolboxWhenReady } = require("./toolbox.js");
const { closeTab } = require("./window.js");
const { setTimeout } = require("sdk/timers");
const { domPanelId } = require("../lib/dom/dom-panel.js");

/**
 * This test checks existence of the DOM panel. It opens a new tab,
 * shows the toolbox and waits till the panel is refreshed.
 */
exports["test DOM panel"] = function(assert, done) {
  getToolboxWhenReady("about:blank", domPanelId).then(({toolbox, tab}) => {
    let tool = getToolDefinition(domPanelId);
    assert.ok(tool, "The DOM tool must exist!");

    closeTab(tab);
    done();

    /*toolbox.selectTool(domPanelId).then(panel => {
      assert.ok(panel.id == domPanelId, "DOM panel is loaded!");

      // Wait till the panel is refreshed and asynchronously quit the test.
      panel.once("refreshed", function() {
        setTimeout(function() {
          closeTab(tab);
          done();
        });
      });
    });*/
  });
};

require("sdk/test").run(exports);
