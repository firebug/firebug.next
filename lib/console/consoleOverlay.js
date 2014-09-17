/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./consoleListener.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { getSelectedTab } = require("sdk/tabs/utils");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Domplate } = require("../core/domplate.js");
const { Dom } = require("../core/dom.js");
const { VariablesView } = require("./variables-view.js");
const { DomSidePanel } = require("../dom/domSidePanel.js");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { DomCache } = require("../dom/domCache.js");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { Theme } = require("../chrome/theme.js");
const { Win } = require("../core/window.js");
const { Heritage } = require("sdk/core/heritage");
const { logPerformanceTiming } = require("./performance-timing.js");

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper syntax otherwise Add-on SDK
// parser fires false exception.
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");

const PROMISE_URI = "resource://gre/modules/Promise.jsm";
let { Promise: promise } = Cu.import(PROMISE_URI, {});

const XHTML_NS = "http://www.w3.org/1999/xhtml";

// Domplate
const { SPAN, A, domplate } = Domplate;

/**
 * @overlay This object is responsible for {@WebConsole} panel customization.
 *
 * See the native structure of {@WebConsolePanel} panel:
 *
 * this.panel => {@WebConsolePanel}
 * this.panel.hud => {@WebConsole}
 * this.panel.hud.ui => {@WebConsoleFrame}
 * this.panel.hud.jsterm => {@JSTerm}
 * this.panel.hud.ui.proxy => {@WebConsoleConnectionProxy}
 */
const ConsoleOverlay = Class(
/** @lends ConsoleOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("consoleOverlay.initialize;", options);

    this.toolbox = options.toolbox;
    this.panelFrame = options.panelFrame;

    // Bind event listeners to preserve |this| scope when handling events.
    this.onVariablesViewOpen = this.onVariablesViewOpen.bind(this);
    this.onVariablesViewFetched = this.onVariablesViewFetched.bind(this);
    this.onSidebarClosed = this.onSidebarClosed.bind(this);
    this.onNewMessages = this.onNewMessages.bind(this);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("consoleOverlay.onReady;", options);

    this.listener = new ConsoleListener(options);

    let hud = this.panel.hud;
    if (!hud) {
      TraceError.sysout("consoleOverlay.onReady; ERROR no hud!", this.panel);
      return;
    }

    // Hook the native VariablesView events.
    let jsterm = hud.jsterm;
    jsterm.on("variablesview-open", this.onVariablesViewOpen);
    jsterm.on("variablesview-fetched", this.onVariablesViewFetched);
    jsterm.on("sidebar-closed", this.onSidebarClosed);

    // Add listeners to {@WebConsoleFrame} object to hook message logging.
    // xxxHonza: The following platform bug needs to be fixed to get the event
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1035707
    // (use attached patch and custom Firefox build for now)
    hud.ui.on("new-messages", this.onNewMessages);

    // Install custom proxy to intercept console.* API and customize
    // rendering (using registered reps).
    this.setupSidePanels();
    this.updateSideSplitterTheme();
  },

  destroy: function() {
    BaseOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("consoleOverlay.destroy;");

    this.listener.destroy();

    let hud = this.panel.hud;

    let jsterm = hud.jsterm;
    if (!jsterm) {
      TraceError.sysout("consoleOverlay.destroy; ERROR jsterm is null!");
      return;
    }

    jsterm.off("variablesview-open", this.onVariablesViewOpen);
    jsterm.off("variablesview-fetched", this.onVariablesViewFetched);
    jsterm.off("sidebar-closed", this.onSidebarClosed);

    // Remove listeners from {@WebConsoleFrame} object.
    hud.ui.off("new-messages", this.onNewMessages);
  },

  // Message Logging Hooks

  onNewMessages: function(topic, messages) {
    messages.forEach(msg => this.onNewLog(msg));
  },

  onNewLog: function(log) {
    Trace.sysout("consoleOverlay.onNewLog;", log);

    let node = log.node;
    let msg = log.message;

    let hud = this.panel.hud;

    // Support for Performance Timing
    // xxxHonza: needs clean up
    if (msg && (msg instanceof Messages.JavaScriptEvalOutput) &&
        msg.response && msg.response.result &&
        msg.response.result.class == "PerformanceTiming") {
      logPerformanceTiming(this, msg);
      return;
    }

    let elementNodes = node.querySelectorAll(".kind-DOMNode");
    let category = node._messageObject ? node._messageObject.category : "";

    // Testing DOM modification
    let doc = node.ownerDocument;
    for (let element of elementNodes) {
      element.appendChild(doc.createTextNode("xxx"));
    }
 },

  getSidePanels: function() {
    return [DomSidePanel];
  },

  setupSidePanels: function() {
    Trace.sysout("consoleOverlay.setupSidePanels;");

    // Disable the DOM side panel for now.
    // See also: https://github.com/firebug/firebug.next/issues/56
    return;

    // The panel is set in onReady and theme is applied sooner.
    if (!this.panel)
      return;

    let jsterm = this.panel.hud.jsterm;

    // Make sure the Console panel side bar is created.
    // xxxHonza: we need better platform API.
    if (!jsterm.sidebar) {
      jsterm._createSidebar();

      // xxxHonza: we can't hide it since the "variables-view" would be created
      // in hidden <tabbox>, which would break selection.
      // Blocked by bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1056033
      //jsterm.sidebar.hide();
    }

    this.sidebar = jsterm.sidebar;

    BaseOverlay.prototype.setupSidePanels.apply(this, arguments);
  },

  // Sidebar Events
  onSidebarClosed: function(eventId) {
    this.updateSideSplitterTheme();
  },

  // VariablesView Events
  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("consoleOverlay.onVariablesViewOpen; ", arguments);

    this.updateSideSplitterTheme();

    // Disable the DOM side panel for now.
    // See also: https://github.com/firebug/firebug.next/issues/56
    return;

    let theme = Theme.getCurrentTheme();
    if (theme != "firebug") {
      return;
    }

    // Render object structure at custom position in the UI (e.g. inside
    // the Console panel when console.dir() is used).
    let targetElement = options.targetElement;
    if (options.targetElement) {
      this.renderVariablesView(options.targetElement, options.objectActor);
      return;
    }

    let doc = view.document;
    let container = doc.querySelector("#variables");

    // xxxHonza: also hide the side tab
    // Remove the original {@VariablesView}.
    //Dom.clearNode(container);
    //this.panel.hud.jsterm.sidebar.hide();

    var config = {
      objectActor: options.objectActor,
      parentNode: container,
      toolbox: view.toolbox
    };

    for (let panel of this.sidePanels.values()) {
      if (panel.supportsObject(options.objectActor)) {
        panel.refresh(options.objectActor);
      }
    }

    this.selectSidePanel("domSidePanel");
  },

  onVariablesViewFetched: function(eventId, aVar) {
    Trace.sysout("consoleOverlay.onVariablesViewFetched; ", arguments);
  },

  // xxxHonza: renders view for console.dir() API
  // Should share implementation with DomSidePanel
  renderVariablesView: function(parentNode, actor) {
    Trace.sysout("consoleOverlay.renderDomView; ", arguments);

    Dom.clearNode(parentNode);

    // Create helper wrapper around the {@DomTree} widget.
    let doc = parentNode.ownerDocument;
    let wrapper = doc.createElementNS(XHTML_NS, "div");
    wrapper.className = "domTableWrapper";
    parentNode.appendChild(wrapper);

    // Get the current thread actor and render the object structure.
    let target = this.toolbox.target;
    target.activeTab.attachThread({}, (response, threadClient) => {
      let cache = new DomCache(threadClient);
      let provider = new DomProvider(cache);
      this.tree = new DomTree(provider);
      this.tree.replace(wrapper, {object: actor});
    });
  },

  // Theme

  // Theme

  applyTheme: function(win, oldTheme) {
    BaseOverlay.prototype.applyTheme.apply(this, arguments);

    if (win.location.href.indexOf("VariablesView.xul") == -1)
      return;

    loadSheet(win, "chrome://firebug/skin/variables-view.css", "author");
  },

  unapplyTheme: function(win, newTheme) {
    BaseOverlay.prototype.unapplyTheme.apply(this, arguments);

    if (win.location.href.indexOf("VariablesView.xul") == -1)
      return;

    removeSheet(win, "chrome://firebug/skin/variables-view.css", "author");
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    Trace.sysout("consoleOverlay.onApplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    // Remove the theme-light class name, we don't want to use
    // the default styles for now.
    // xxxHonza: hack FIX ME
    win.classList.remove("theme-light");

    Win.loaded(iframeWin).then(doc => {
      this.updateSideSplitterTheme();
    });

    this.setupSidePanels();

    // Load theme stylesheets into the Console frame.
    loadSheet(iframeWin, "chrome://firebug/skin/webconsole.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/html.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/performance-timing.css", "author");

    Theme.customizeSideBarSplitter(iframeWin, true);
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Trace.sysout("consoleOverlay.onUnapplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    Win.loaded(iframeWin).then(doc => {
      this.updateSideSplitterTheme();
    });

    this.removeSidePanels();

    // Unload theme stylesheets from the Console frame.
    removeSheet(iframeWin, "chrome://firebug/skin/webconsole.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/html.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/performance-timing.css", "author");

    Theme.customizeSideBarSplitter(iframeWin, false);
  },

  updateSideSplitterTheme: function() {
    let doc = this.getPanelDocument();
    let splitter = doc.querySelector(".devtools-side-splitter");

    // Do not mess the styling if Firebug theme isn't active.
    if (!Theme.isFirebugActive()) {
      splitter.removeAttribute("collapsed");
      return;
    }

    // Applying themes can happen quite soon (panel doesn't have
    // to be fully ready yet).
    let jsterm = this.panel ? this.panel.hud.jsterm : null;
    if (!jsterm) {
      return;
    }

    // The splitter shouldn't be visible if the side bar is closed.
    let visible = isSideBarVisible(jsterm.sidebar);
    if (visible) {
      splitter.removeAttribute("collapsed");
    } else {
      splitter.setAttribute("collapsed", "true");
    }
  },

  // Commands

  clearConsole: function() {
    let doc = this.getPanelDocument();

    // xxxHonza: TESTME (the id of the clear button could change).
    let clearButton = doc.querySelector(".webconsole-clear-console-button");
    clearButton.click();
  }
});

// Helpers

// xxxHonza: could be implemented in {@BasePanel} or {@BaseOverlay}?
function isSideBarVisible(sidebar) {
  if (!sidebar)
    return false;

  return sidebar._tabbox.hasAttribute("hidden") ? false : true;
}

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
