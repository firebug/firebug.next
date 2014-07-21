/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
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
const { Xul } = require("../core/xul.js");
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

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

// Domplate
const { SPAN, A, domplate } = Domplate;

// XUL Builder
const { BOX, VBOX, HBOX, SPLITTER } = Xul;

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

    // xxxHonza: blocked by issue #15 (tree items are not expandable
    // in a panel or side panel)
    //return;

    // Definition of the new panel content layout.
    // xxxHonza: copied from the basePanel.
    var content =
      HBOX({"class": "panelContent", "flex": "1"},
        VBOX({"id": "panelMainBox", "flex": "1"}),
        SPLITTER({"id": "panelSplitter", "valign": "top"},
          BOX({"id": "panelSplitterBox"})
        ),
        VBOX({"id": "panelSideBox", "width": "300px"})
      );

    // Build XUL DOM structure.
    let doc = this.panelFrame.ownerDocument;
    let panelBox = doc.getElementById("toolbox-panel-webconsole");
    var panelContent = content.build(panelBox);

    let mainBox = panelContent.querySelector("#panelMainBox");
    mainBox.appendChild(this.panelFrame);

    this.setupSidePanels(doc, panelContent);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("consoleOverlay.onReady;", options);

    // Load Firebug theme stylesheets.
    let frameWin = this.panel._frameWindow;
    loadSheet(frameWin, "chrome://firebug/skin/webconsole.css", "author");
    loadSheet(frameWin, "chrome://firebug/skin/domTree.css", "author");
    loadSheet(frameWin, "chrome://firebug/skin/html.css", "author");

    this.listener = new ConsoleListener(options);

    let jsterm = this.panel.hud.jsterm;

    // Hook the native VariablesView events.
    jsterm.on("variablesview-open", this.onVariablesViewOpen.bind(this));
    jsterm.on("variablesview-fetched", this.onVariablesViewFetched.bind(this));

    // Install custom proxy to intercept console.* API and customize
    // rendering (using registered reps).
    this.overlayProxy();

    //xxxHonza: the Console panel should use built-in side bar.
    /*if (!jsterm.sidebar)
      jsterm._createSidebar();

    let sidebar = jsterm.sidebar;
    let prefName = "devtools.inspector.activeSidebar";
    let defaultTab = Services.prefs.getCharPref(prefName);
    sidebar.addTab("dom", self.data.url("dom.html"), "dom" == defaultTab);*/
  },

  destroy: function() {
    this.listener.destroy();
  },

  // VariablesView Events
  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("consoleOverlay.onVariablesViewOpen; ", arguments);

    // Render object structure at custom position in the UI (e.g. inside
    // the Console panel when console.dir() is used).
    let targetElement = options.targetElement;
    if (options.targetElement) {
      this.renderVariablesView(options.targetElement, options.objectActor);
      return;
    }

    let doc = view.document;
    let container = doc.querySelector("#variables");

    // Remove the original {@VariablesView}.
    Dom.clearNode(container);

    var config = {
      objectActor: options.objectActor,
      parentNode: container,
      toolbox: view.toolbox
    };

    this.panel.hud.jsterm.sidebar.hide();

    for (let panel of this.sidePanels) {
      if (panel.supportsObject(options.objectActor)) {
        panel.refresh(options.objectActor);
      }
    }
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
    frame.proxy.disconnect().then(() => {
      Trace.sysout("consoleOverlay.overlayProxy; Original proxy disconnected");
    })

    // Custom proxy
    frame.proxy = new ConsoleProxy(frame, frame.owner.target);

    frame.proxy.connect().then(() => {
      Trace.sysout("consoleOverlay.overlayProxy; New proxy connected");
    }, (reason) => {
      TraceError.sysout("consoleOverlay.overlayProxy; ERROR " + reason, reason);
    });
  },

  getSidePanels: function() {
    return [DomSidePanel];
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    if (iframeWin.location.href.indexOf("webconsole.xul") == -1)
      return;

    Trace.sysout("consoleOverlay.onApplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    // Remove the theme-light class name, we don't want to use
    // the default styles for now.
    win.classList.remove("theme-light");

    let buttons = doc.querySelectorAll(".devtools-toolbarbutton");
    for (let button of buttons) {
      button.classList.remove("devtools-toolbarbutton");
      button.classList.remove("webconsole-filter-button");
    }

    Win.loaded(iframeWin).then(() => {
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.setAttribute("collapsed", "true");
    });

    //Theme.customizeSideBarSplitter(iframeWin, true);
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    if (iframeWin.location.href.indexOf("webconsole.xul") == -1)
      return;

    Trace.sysout("consoleOverlay.onUnapplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    let buttons = doc.querySelectorAll(".devtools-toolbarbutton");
    for (let button of buttons) {
      button.classList.add("devtools-toolbarbutton");
      button.classList.add("webconsole-filter-button");
    }

    Win.loaded(iframeWin).then(() => {
      var splitter = doc.querySelector(".devtools-side-splitter");
      splitter.removeAttribute("collapsed");
    });

    //Theme.customizeSideBarSplitter(iframeWin, false);
  },
});

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
