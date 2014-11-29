/* See license.txt for terms of usage */

"use strict";

const { defer } = require("sdk/core/promise");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab } = require("sdk/tabs/utils");
const { closeTab } = require("sdk/tabs/utils");

/**
 * Opens new browser tab.
 * 
 * @param {String} url URL of the tab content.
 * @param {Object} config Configuration flags
 * @returns {Object} Reference to the opened tab
 */
function openBrowserTab(url, config = {}) {
  let browser = config.browser || getMostRecentBrowserWindow();
  return openTab(browser, url, {
    inBackground: config.inBackground
  });
}

/**
 * Opens new browser tab and waits till the content is loaded.
 *
 * @param {String} url URL of the tab content.
 * @param {Object} config Configuration flags
 * @returns {Promise} A promise that is resolved when the tab is loaded.
 */
function getTabWhenReady(url, config = {}) {
  let newTab = openBrowserTab(url, config);
  return waitForPageLoad(newTab);
}

/**
 * Waits till specified tab/page is fully loaded.
 *
 * @param tab The tab we are waiting for.
 * @returns {Promise} A promise that is resolved when the page is loaded.
 */
function waitForPageLoad(tab) {
  let deferred = defer();
  let tabBrowser = getBrowserForTab(tab);

  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);
    deferred.resolve({tab: tab});
  }

  tabBrowser.addEventListener("load", onPageLoad, true);
  return deferred.promise;
}

// Exports from this module
exports.openBrowserTab = openBrowserTab;
exports.getTabWhenReady = getTabWhenReady;
exports.waitForPageLoad = waitForPageLoad;
exports.closeTab = closeTab;
