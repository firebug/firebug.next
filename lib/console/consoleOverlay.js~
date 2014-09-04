/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./consoleListener.js");
const { ConsoleProxy } = require("./console-proxy.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { ToolbarButton } = require("../chrome/panelToolbar.js");
const { getSelectedTab } = require("sdk/tabs/utils");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
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

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper syntax otherwise Add-on SDK
// parser fires false exception.
const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");
const Heritage = require("sdk/core/heritage");

Cu.import("resource:///modules/devtools/DOMHelpers.jsm");
Cu.import("resource://gre/modules/Services.jsm");

const PROMISE_URI = "resource://gre/modules/Promise.jsm";
let { Promise: promise } = Cu.import(PROMISE_URI, {});

const XHTML_NS = "http://www.w3.org/1999/xhtml";

// Domplate
const { SPAN, A, domplate } = Domplate;

/**
 * @overlay This object is responsible for {@WebConsole} panel customization.
 * The customization is applied when the Console panel is created and
 * sends 'ready' event.
 *
 * Native structure the webconsole panel (this.panel is initialized in
 * onReady method).
 *
 * this.panel => WebConsolePanel
 * this.panel.hud => WebConsole
 * this.panel.hud.ui => WebConsoleFrame
 * this.panel.hud.jsterm => JSTerm
 * this.panel.hud.ui.proxy => WebConsoleConnectionProxy
 *
 * TODO: side panel logic must be shared with the {@BasePanel}
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

    this.onVariablesViewOpen = this.onVariablesViewOpen.bind(this);
    this.onVariablesViewFetched = this.onVariablesViewFetched.bind(this);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("consoleOverlay.onReady;", options);

    this.listener = new ConsoleListener(options);

    // Hook the native VariablesView events.
    let jsterm = this.panel.hud.jsterm;
    jsterm.on("variablesview-open", this.onVariablesViewOpen);
    jsterm.on("variablesview-fetched", this.onVariablesViewFetched);

    // Install custom proxy to intercept console.* API and customize
    // rendering (using registered reps).
    this.overlayProxy();
    this.setupSidePanels();
  },

  destroy: function() {
    Trace.sysout("consoleOverlay.destroy;");

    this.listener.destroy();

    let jsterm = this.panel.hud.jsterm;
    if (!jsterm) {
      TraceError.sysout("consoleOverlay.destroy; ERROR jsterm is null!");
      return;
    }

    jsterm.off("variablesview-open", this.onVariablesViewOpen);
    jsterm.off("variablesview-fetched", this.onVariablesViewFetched);
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

  // VariablesView Events
  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("consoleOverlay.onVariablesViewOpen; ", arguments);

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

  overlayProxy: function() {
    // Usually WebConsoleFrame instance (wrapping the console output).
    let frame = this.panel.hud.ui;

    // xxxHonza: disconnecting proxy is asynchronous and cached
    // messages get through before we install the new proxy.
    // See _onCachedMessages in webconsole.js
    // There must be a better way how to customize rendering
    // of existing logs (a new event fired with cancel support?).
    // xxxHonza: the custom proxy is not properly disconnected/destroyed
    // when the extension is disabled.
    /*frame.proxy.disconnect().then(() => {
      Trace.sysout("consoleOverlay.overlayProxy; Original proxy disconnected");
    });

    // Custom proxy
    frame.proxy = new ConsoleProxy(frame, frame.owner.target);

    frame.proxy.connect().then(() => {
      Trace.sysout("consoleOverlay.overlayProxy; New proxy connected");
    }, (reason) => {
      TraceError.sysout("consoleOverlay.overlayProxy; ERROR " + reason, reason);
    });*/
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    Trace.sysout("consoleOverlay.onApplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    // Remove the theme-light class name, we don't want to use
    // the default styles for now.
    // xxxHonza: hack FIX ME
    win.classList.remove("theme-light");

    let buttons = doc.querySelectorAll(".devtools-toolbarbutton");
    for (let button of buttons) {
      button.classList.remove("devtools-toolbarbutton");
      button.classList.remove("webconsole-filter-button");
      button.classList.add("firebug-theme-mark")
    }

    Win.loaded(iframeWin).then(doc => {
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.setAttribute("collapsed", "true");
    });

    this.setupSidePanels();

    // Load theme stylesheets into the Console frame.
    loadSheet(iframeWin, "chrome://firebug/skin/webconsole.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/html.css", "author");

    //Theme.customizeSideBarSplitter(iframeWin, true);
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Trace.sysout("consoleOverlay.onUnapplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    let buttons = doc.querySelectorAll(".firebug-theme-mark");
    for (let button of buttons) {
      button.classList.add("devtools-toolbarbutton");
      button.classList.add("webconsole-filter-button");
    }

    Win.loaded(iframeWin).then(doc => {
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.removeAttribute("collapsed");
    });

    this.removeSidePanels();

    // Unload theme stylesheets from the Console frame.
    removeSheet(iframeWin, "chrome://firebug/skin/webconsole.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/html.css", "author");

    //Theme.customizeSideBarSplitter(iframeWin, false);
  }
});

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
