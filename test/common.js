/* See license.txt for terms of usage */

"use strict";

const { main, Firebug } = require("../lib/index.js");
const { openToolbox } = require("dev/utils");
const { defer } = require("sdk/core/promise");
const { serve, host } = require("./httpd.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { setTimeout } = require("sdk/timers");

/**
 * xxxHonza: design this API as asynchronous
 * TODO: description
 */
function loadFirebug() {
  if (!Firebug.chromes) {
    main({loadReason: "install"});
  }
};

/**
 * Open the toolbox. Depending on the configuration flags, this method
 * can also open a new browser tab and load custom test page.
 *
 * xxxHonza: TODO: support also the case where no new tab should be opened.
 *
 * @param {Object} config See the following list of supported flags:
 *
 * panelId {String} Id of the panel that should be selected by default
 * pageContent {String} Custom page content (HTML)
 * inBackground {Boolean} True if new tab should be opened in background.
 * Set to false if the new tab should be automatically selected.
 */
exports.openToolbox = function(config) {
  // Set up default config flags
  config.panelId = config.panelId || "webconsole";
  config.pageContent = config.pageContent ||
    "<html><head></head><body><script></script></body></html>";
  config.inBackground = config.inBackground || false;

  // Make sure Firebug is loaded.
  loadFirebug();

  let title = "testPage";
  let url = host + title + ".html";
  let server = serve({ name: title, content: config.pageContent });

  // Open new browser tab.
  let browser = getMostRecentBrowserWindow();
  let newTab = openTab(browser, url, {
    inBackground: config.inBackground
  });

  // The result promise.
  let deferred = defer();

  let tabBrowser = getBrowserForTab(newTab);
  function onPageLoad() {
    tabBrowser.removeEventListener("load", onPageLoad, true);

    // Workaround for https://github.com/mozilla/addon-sdk/pull/1688
    let id = {
      prototype: {},
      id: config.panelId
    };

    // Open the toolbox with given panel selected by default.
    openToolbox(id).then(toolbox => {
      let options = {};
      options.toolbox = toolbox;
      options.panel = toolbox.getCurrentPanel();
      options.overlay = options.panel._firebugPanelOverlay;

      // Asynchronous clean up.
      options.cleanUp = function(done) {
        setTimeout(() => {
          server.stop(() => {
            closeTab(newTab);
            done();
          });
        })
      }

      deferred.resolve(options);
    });
  }

  tabBrowser.addEventListener("load", onPageLoad, true);

  return deferred.promise;
}

// Exports from this module
exports.loadFirebug = loadFirebug;
