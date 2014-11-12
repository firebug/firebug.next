/* See license.txt for terms of usage */

"use strict";

const { Firebug } = require("../lib/index.js");
const { defer } = require("sdk/core/promise");

/**
 * xxxHonza: TODO description
 *
 * @param toolbox
 * @param config
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
 * xxxHonza: TODO description
 *
 * @param toolbox
 * @param sidePanelId
 * @returns
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
        sidePanel: sidebar.getTab(sidePanelId)
      });
    });
  });

  consoleOverlay.toggleSidebar();

  return deferred.promise;
}

// Exports from this module
exports.waitForMessage = waitForMessage;
exports.openSidePanel = openSidePanel;
