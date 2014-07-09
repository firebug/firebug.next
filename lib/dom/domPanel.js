/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

var self = require("sdk/self");
var main = require("../main.js");

const { Cu, Ci } = require("chrome");
const { BasePanel } = require("../chrome/basePanel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js");
const { Tool } = require("dev/toolbox");
const { Locale } = require("../core/locale.js");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { DomCache } = require("../dom/domCache.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { defer } = require("sdk/core/promise");

/**
 * @panel This object implements a main DOM panel. It displays structure
 * of the current document. The panel might be converted into DevTools SDK
 * example showing how to render remote objects (grips) by using repository
 * of registered templates {@Reps}.
 */
const DomPanel = Class(
/** @lends DomPanel */
{
  extends: BasePanel,

  label: Locale.$STR("domPanelTitle"),
  tooltip: "DOM panel example",
  icon: "./icon-16.png",
  url: "./dom.html",

  // Initialization
  setup: function({debuggee, frame, toolbox}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("DomPanel.setup;", frame);
  },

  onReady: function() {
    Trace.sysout("DomPanel.onReady;", this);

    // xxxHonza: theme applying and switch must be centralized
    // (see also theme-switcher)
    let win = this.frame.contentWindow;
    loadSheet(win, "chrome://firebug/skin/domTree.css", "author");

    this.panelNode = win.document.body;

    // Get the current {@ThreadClient}. It might cause tab attach
    // (happens asynchronously) if the toolbox isn't attached yet.
    let target = this.toolbox.target;
    target.activeTab.attachThread({}, (response, threadClient) => {
      Trace.sysout("domPanel.onReady; threadClient", arguments);

      // Attach Console. It might involve RDP communication, so wait
      // asynchronously for the result
      this.attachConsole(threadClient).then(consoleClient => {
        Trace.sysout("domPanel.onReady; consoleClient", arguments);

        // Evaluate an expression to get the top level actor.
        // The goal is to render that actor in the panel content.
        consoleClient.evaluateJS("document", (response) => {
          if (!this.initialized)
            this.refresh(response.result);

          // xxxHonza: this is needed? Shouldn't it resume automatically?
          threadClient.resume();
        });

        // An example of getting node info (e.g. isDisplayed)
        /*this.toolbox.initInspector().then(() => {
          var expr = "document.getElementById('hidden')";
          consoleClient.evaluateJS(expr, (response) => {
            let objectActor = response.result;
            let walker = this.toolbox.walker;
            walker.getNodeActorFromObjectActor(objectActor.actor).
              then((nodeFront) => {
                Trace.sysout("nodeFront", nodeFront);
              });
          });
        })*/

      });
    });
  },

  attachConsole: function(threadClient) {
    let deferred = defer();
    let debuggerClient = threadClient.client;
    let consoleActor = this.toolbox.target.form.consoleActor;

    debuggerClient.attachConsole(consoleActor, ["ConsoleAPI"],
      (response, webConsoleClient) => {

      Trace.sysout("domPanel.attachConsole; ", arguments);

      if (response.error)
        deferred.reject(response);
      else
        deferred.resolve(webConsoleClient);
    });

    return deferred.promise;
  },

  // Selection
  select: function(object) {
    Trace.sysout("domPanel.select; object:", object);

    this.refresh(object);
  },

  refresh: function(actor) {
    Trace.sysout("domPanel.refresh; actor:", actor);

    let target = this.toolbox.target;
    target.activeTab.attachThread({}, (response, threadClient) => {
      // xxxHonza: there should be just one instance of the cache
      // (see also ConsoleOverlay).
      // The initialization should happen just once.
      let cache = new DomCache(threadClient);
      let provider = new DomProvider(cache);
      this.tree = new DomTree(provider);
      this.tree.replace(this.panelNode, {object: actor});

      this.initialized = true;
    });
  },
});

// Panel registration
const domTool = new Tool({
  name: "DOM Tool",
  panels: {
    domPanel: DomPanel
  }
});

// Exports from this module
exports.DomPanel = DomPanel;
