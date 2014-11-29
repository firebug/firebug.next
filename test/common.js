/* See license.txt for terms of usage */

"use strict";

const { main, Firebug } = require("../lib/index.js");
const { openToolbox, closeToolbox } = require("dev/utils");
const { defer } = require("sdk/core/promise");
const { serve, host } = require("./httpd.js");
const { closeTab } = require("sdk/tabs/utils");
const { setTimeout } = require("sdk/timers");
const { openBrowserTab, waitForPageLoad } = require("./window.js");

/**
 * xxxHonza: design this API as asynchronous
 * TODO: description
 */
function loadFirebug() {
  if (!Firebug.chromes) {
    main({loadReason: "install"});
  }

  // xxxHonza: loadFirebug must be asynchronous FIXME
  /*let deferred = defer();
  if (!Firebug.chromes) {
    main({loadReason: "install"});

    // xxxHonza: wait till Firebug is fully initialized
    // (e.g. logger actor registered and attached)
    deferred.resolve();
  }
  return deferred.promise;*/
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
 *
 * inBackground {Boolean} True if new tab should be opened in background.
 * Set to false if the new tab should be automatically selected.
 *
 * url {String} Url of the page that should be opened. The test HTTP server
 * doesn't start if an URL is specified. Some tests don't need an HTML page
 * and it's good practice to specify e.g. 'about:blank' to avoid starting
 * the test server (which takes some time).
 *
 * browserTab {object} Parent browser tab for the toolbox. If no tab
 * is specified new one is opened.
 */
exports.openToolbox = function(config) {
  // Set up default config flags
  config.panelId = config.panelId || "webconsole";
  config.inBackground = config.inBackground || false;

  // Make sure Firebug is loaded.
  loadFirebug();

  let server;
  let url = config.url;

  // Start server only if default URL isn't provided
  if (!url) {
    config.title = config.pageName || "testPage";
    url = host + config.title + ".html";
    server = startServer(config);
  }

  // Use specified browser tab or open a new one.
  let newTab = config.browserTab ? config.browserTab :
    openBrowserTab(url, config);

  // The result promise.
  let deferred = defer();

  waitForPageLoad(newTab).then(() => {
    // Workaround for https://github.com/mozilla/addon-sdk/pull/1688
    // xxxHonza: TODO Merged, let's wait till it's in Nightly
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1091888
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
      options.browserTab = newTab;

      // Asynchronous clean up. Make sure to shutdown the server if running.
      options.cleanUp = function(done) {
        setTimeout(() => {
          if (server) {
            stopServer(server, () => {
              closeTab(newTab);
              done();
            });
          } else {
            closeTab(newTab);
            done();
          }
        });
      }

      // Asynchronous toolbox destroy.
      options.closeToolbox = function(toolbox) {
        let deferred = defer();

        // Fired after all panels are also destroyed.
        toolbox.once("destroyed", (eventId, target) => {
          deferred.resolve(options);
        });

        closeToolbox(toolbox.target.tab);
        return deferred.promise;
      }

      // Resolve the return (page loaded & toolbox opened) promise.
      deferred.resolve(options);
    });
  });

  return deferred.promise;
}

/**
 * Starts new instance of HTTP server.
 */
function startServer(config) {
  // Start HTTP server
  return serve({
    name: config.title,
    content: config.pageContent,
    pathHandler: config.pathHandler
  });
}

/**
 * Destroy an existing instance of HTTP server.
 */
function stopServer(server, callback) {
  return server.stop(callback);
}

// Exports from this module
exports.loadFirebug = loadFirebug;
