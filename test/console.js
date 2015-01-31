/* See license.txt for terms of usage */

"use strict";

const { Firebug } = require("../lib/index.js");
const { defer } = require("sdk/core/promise");

/**
 * Wait for a message displayed in the Console panel.
 *
 * @param {Toolbox} toolbox The current toolbox instance.
 * @param {Object} config Configuration object with the following flags:
 * {String} cssSelector CSS selector that identifies the message
 * (or messages) to wait for.
 *
 * @returns {Promise} A promise that is resolved when a message(s)
 * that matches provided CSS selector is displayed.
 */
function waitForMessage(toolbox, config) {
  let deferred = defer();
  let chrome = Firebug.getChrome(toolbox);
  let consoleOverlay = chrome.getOverlay("webconsole");
  let frame = consoleOverlay.panel.hud.ui;
  let doc = consoleOverlay.getPanelDocument();
  let result = doc.querySelector(config.cssSelector);

  if (result) {
    deferred.resolve(result)
    return deferred.promise;
  }

  function onMessages(event, messages) {
    let doc = consoleOverlay.getPanelDocument();
    let result = doc.querySelectorAll(config.cssSelector);
    if (result.length) {
      frame.off("new-messages", onMessages);
      deferred.resolve(result);
    }
  }

  frame.on("new-messages", onMessages);

  return deferred.promise;
}

/**
 * Open side panel in the Console panel. The API expects that the
 * side panel is implemented using {@ToolSidebar} widget from
 * the platform.
 *
 * xxxHonza: this API should be used for any panel in the toolbox, but
 * not every panel is using {@ToolSidebar}, see also:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1074710
 *
 * @param {Toolbox} toolbox The current toolbox instance.
 * @param {String} sidePanelId ID of the side panel to be selected
 * by default.
 *
 * @returns {Promise} A promise that is resolved when the side panel
 * is opened and default panel selected and loaded (i.e. panel content
 * iframe loaded and ready to use).
 */
function openSidePanel(toolbox, sidePanelId) {
  let deferred = defer();
  let chrome = Firebug.getChrome(toolbox);
  let panel = toolbox.getPanel("webconsole")
  let consoleOverlay = panel._firebugPanelOverlay;
  let jsterm = consoleOverlay.getTerminal();

  jsterm.once("sidebar-created", (eventName, sidebar) => {
    if (!sidebar) {
      reject(new Error("can't get the sidebar"));
    }

    sidebar.once(sidePanelId + "-ready", () => {
      sidebar.select(sidePanelId);
      deferred.resolve({
        panel: panel,
        sidePanel: sidebar.getTabPanel(sidePanelId)
      });
    });
  });

  consoleOverlay.toggleSidebar();

  return deferred.promise;
}

// Exports from this module
exports.waitForMessage = waitForMessage;
exports.openSidePanel = openSidePanel;
