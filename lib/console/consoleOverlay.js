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
const { getSelectedTab } = require("sdk/tabs/utils");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Domplate } = require("../core/domplate.js");
const { Dom } = require("../core/dom.js");
const { VariablesView } = require("./variables-view.js");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { DomCache } = require("../dom/domCache.js");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { Theme } = require("../chrome/theme.js");
const { Win } = require("../core/window.js");
const { ToolbarButton } = require("../chrome/panelToolbar.js");
const { ToggleSideBarButton } = require("../chrome/toggleSideBarButton.js");

// Side panels
const { DomSidePanel } = require("../dom/domSidePanel.js");
const { CommandEditor } = require("./command-editor.js");

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper syntax otherwise Add-on SDK
// parser fires false exception.
const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");
const Heritage = require("sdk/core/heritage");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const PROMISE_URI = "resource://gre/modules/Promise.jsm";
let { Promise: promise } = Cu.import(PROMISE_URI, {});

const XHTML_NS = "http://www.w3.org/1999/xhtml";
const persistPrefName = "devtools.webconsole.persistlog";

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

    this.onVariablesViewOpen = this.onVariablesViewOpen.bind(this);
    this.onVariablesViewFetched = this.onVariablesViewFetched.bind(this);
    this.onSidebarClosed = this.onSidebarClosed.bind(this);

    this.onSidebarCreated = this.onSidebarCreated.bind(this);
    this.onSidebarDestroyed = this.onSidebarDestroyed.bind(this);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("consoleOverlay.onReady;", options);

    this.listener = new ConsoleListener(options);

    if (!this.panel.hud) {
      TraceError.sysout("consoleOverlay.onReady; ERROR no hud!", this.panel);
      return;
    }

    // Hook the native VariablesView events.
    let jsterm = this.panel.hud.jsterm;
    jsterm.on("variablesview-open", this.onVariablesViewOpen);
    jsterm.on("variablesview-fetched", this.onVariablesViewFetched);
    jsterm.on("sidebar-closed", this.onSidebarClosed);

    jsterm.on("sidebar-created", this.onSidebarCreated);
    jsterm.on("sidebar-destroyed", this.onSidebarDestroyed);

    // Install custom proxy to intercept console.* API and customize
    // rendering (using registered reps).
    this.overlayProxy();
    this.setupSidePanels();
    this.updateSideSplitterTheme();
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
    jsterm.off("sidebar-closed", this.onSidebarClosed);

    jsterm.off("sidebar-created", this.onSidebarCreated);
    jsterm.off("sidebar-destroyed", this.onSidebarDestroyed);
  },

  getSidePanels: function() {
    // xxxHonza: the DOM should be removed eventually
    return [CommandEditor, DomSidePanel];
  },

  setupSidePanels: function() {
    Trace.sysout("consoleOverlay.setupSidePanels;");

    // The panel is set in onReady and theme is applied sooner.
    if (!this.panel)
      return;

    // Make sure the Console panel side bar is created.
    // xxxHonza: we need better platform API.
    let jsterm = this.panel.hud.jsterm;
    if (!jsterm.sidebar) {
      // xxxHonza: we can't hide it since the "variables-view" would be created
      // in hidden <tabbox>, which would break selection (and also contentWindow
      // is not set from some reason).
      // Blocked by bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1056033
      return;

      jsterm._createSidebar();
      jsterm.sidebar.hide();
    }

    this.sidebar = jsterm.sidebar;

    BaseOverlay.prototype.setupSidePanels.apply(this, arguments);
  },

  // Sidebar Events

  onSidebarClosed: function(eventId) {
    Trace.sysout("consoleOverlay.onSidebarClosed;", sidebar);

    this.updateSideSplitterTheme();
  },

  onSidebarCreated: function(eventId, sidebar) {
    Trace.sysout("consoleOverlay.onSidebarCreated;", sidebar);

    // xxxHonza: just testing
    sidebar.on("show", () => {
      Trace.sysout("!!! on side bar show");
    });

    sidebar.on("hide", () => {
      Trace.sysout("!!! on side bar hide");
    });
  },

  onSidebarDestroyed: function(eventId, sidebar) {
    Trace.sysout("consoleOverlay.onSidebarDestroyed;", sidebar);
  },

  toggleSidebar: function() {
    let jsterm = this.panel.hud.jsterm;

    Trace.sysout("consoleOverlay.toggleSidebar; " + jsterm.sidebar);

    if (jsterm.sidebar) {
      jsterm.sidebar.toggle();
    } else {
      // xxxHonza: the timeout must be there, see:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1056033
      jsterm._createSidebar();
      jsterm.sidebar._panelDoc.defaultView.setTimeout(() => {
        this.setupSidePanels();
      }, 200);
    }

    this.updateSideSplitterTheme();
  },

  // VariablesView Events

  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("consoleOverlay.onVariablesViewOpen; ", arguments);

    this.updateSideSplitterTheme();

    // Disable the DOM side panel for now.
    // See also: https://github.com/firebug/firebug.next/issues/56
    return;

    if (!Theme.isFirebugActive()) {
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
    let hud = this.panel.hud
    let frame = hud.ui;

    // xxxHonza: testing
    frame.on("messages-added", () => {
      //Trace.sysout("consoleOverlay; messageAdded", arguments);
    });

    frame.on("messages-updated", () => {
      //Trace.sysout("consoleOverlay; messageUpdated", arguments);
    });

    frame.on("onConsoleAPICall", () => {
      Trace.sysout("consoleOverlay; onConsoleAPICall", arguments);
    });

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

    Theme.customizeSideBarSplitter(iframeWin, true);

    Win.loaded(iframeWin).then(doc => {
      this.updateSideSplitterTheme();
      this.updatePersistButton(true);

      this.toggleSideBar = new ToggleSideBarButton({
        panel: this,
        toolbar: doc.querySelector(".hud-console-filter-toolbar"),
      });
    });

    // Load theme stylesheets into the Console frame.
    loadSheet(iframeWin, "chrome://firebug/skin/webconsole.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/html.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Trace.sysout("consoleOverlay.onUnapplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    Theme.customizeSideBarSplitter(iframeWin, false);

    Win.loaded(iframeWin).then(doc => {
      this.updateSideSplitterTheme();
      this.updatePersistButton(false);
    });

    this.toggleSideBar.destroy();

    // Unload theme stylesheets from the Console frame.
    removeSheet(iframeWin, "chrome://firebug/skin/webconsole.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/html.css", "author");
  },

  updateSideSplitterTheme: function() {
    let doc = this.getPanelDocument();
    let splitter = doc.querySelector(".devtools-side-splitter");

    // Do not mess the styling if Firebug theme isn't active.
    if (!Theme.isFirebugActive()) {
      splitter.removeAttribute("collapsed");
      return;
    }

    // The HUD doesn't have to exist at this moment. It's available
    // when the 'ready' event is fired.
    let jsterm = this.panel.hud ? this.panel.hud.jsterm : null;
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

  /**
   * Create/Remove an additional 'Persist' button that is available
   * when the Firebug theme is active. The button can be used to
   * disable console-clear when the page is reloaded.
   */
  updatePersistButton : function(apply) {
    let doc = this.getPanelDocument();
    let toolbar = doc.querySelector(".hud-console-filter-toolbar");
    let clearButton = doc.querySelector(".webconsole-clear-console-button");

    if (apply) {
      let button = new ToolbarButton({
        id: "firebug-persist-console",
        toolbar: toolbar,
        referenceElement: clearButton.nextSibling,
        type: "checkbox",
        checked: Services.prefs.getBoolPref(persistPrefName),
        label: "firebug.menu.PersistConsole",
        tooltiptext: "firebug.menu.tip.PersistConsole",
        command: this.onPersist.bind(this)
      });
    } else {
      let persistButton = doc.getElementById("firebug-persist-console");
      if (persistButton)
        persistButton.remove();
    }
  },

  // Commands

  clearConsole: function() {
    let doc = this.getPanelDocument();

    // xxxHonza: TESTME (the id of the clear button could change).
    let clearButton = doc.querySelector(".webconsole-clear-console-button");
    clearButton.click();
  },

  onPersist: function() {
    let value = Services.prefs.getBoolPref(persistPrefName);
    Services.prefs.setBoolPref(persistPrefName, !value);
  },

  /**
   * Execute JS expression on the back end.
   *
   * @param {String} expr JavaScript expression to be executed.
   * @param {Function} callback Executed when the result come back.
   */
  execute: function(expr, callback) {
    // xxxHonza: unify usage of HUD
    if (!this.panel.hud) {
      TraceError.sysout("consoleOverlay.execute; ERROR no HUD!");
      return;
    }

    // Execute on the back end. TEST ME
    this.panel.hud.jsterm.execute(expr, callback);
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
