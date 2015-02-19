/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { target } = require("../target.js");
const { Options } = require("../core/options.js");
const { observer: tabsObserver } = require("sdk/tabs/observer");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

// DevTools
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

/**
 * TODO docs
 */
var Activation =
/** @lends Activation */
{
  initialize: function() {
    Trace.sysout("Activation.initialize;", arguments);

    this.onTabOpen = this.onTabOpen.bind(this);
    this.onTabActivate = this.onTabActivate.bind(this);

    tabsObserver.on("open", this.onTabOpen);
    tabsObserver.on("activate", this.onTabActivate);
  },

  initialized: function() {
    Trace.sysout("Activation.initialized;", arguments);

    // Open the toolbox for the default tab (the 'activate' event
    // has already been fired). This happens after the 'initialize'
    // event has been fired, so 'onToolboxCreated' is not fired
    // before 'initialize'.
    let browser = getMostRecentBrowserWindow();
    let activeTab = browser.gBrowser.selectedTab;
    if (activeTab) {
      this.openToolbox(activeTab);
    }
  },

  shutdown: function(reason) {
    Trace.sysout("Activation.shutdown; " + reason);

    tabsObserver.removeListener("open", this.onTabOpen);
    tabsObserver.removeListener("activate", this.onTabActivate);
  },

  // Event Handlers

  onTabOpen: function(tab) {
    let uri = tab.linkedBrowser.currentURI.spec;
    Trace.sysout("Activation.onTabOpen; " + uri, tab);
  },

  onTabActivate: function(tab) {
    let uri = tab.linkedBrowser.currentURI.spec;
    Trace.sysout("Activation.onTabActivate; " + uri, tab);

    this.openToolbox(tab);
  },

  // Toolbox

  openToolbox: makeInfallible(function(tab) {
    let alwaysOn = Options.get("allPagesActivation");
    if (alwaysOn != "on") {
      return;
    }

    Trace.sysout("Activation.openToolbox; " + alwaysOn);

    let target = devtools.TargetFactory.forTab(tab);
    gDevTools.showToolbox(target).then(function(toolbox) {
      Trace.sysout("Activation.openToolbox; Toolbox ready", toolbox);
    });
  })
}

// Registration
target.register(Activation);

// Exports from this module
exports.Activation = Activation;
