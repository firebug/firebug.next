/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./console-listener.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { getSelectedTab } = require("sdk/tabs/utils");
const { Domplate } = require("../core/domplate.js");
const { Dom } = require("../core/dom.js");
const { VariablesView } = require("./variables-view.js");
const { DomTree } = require("../dom/dom-tree.js");
const { DomProvider } = require("../dom/dom-provider.js");
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { Theme } = require("../chrome/theme.js");
const { Menu } = require("../chrome/menu.js");
const { Win } = require("../core/window.js");
const { ToolbarButton } = require("../chrome/panel-toolbar.js");
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");
const { RemoteLoggingFilter } = require("./remote/logging-filter.js");
const { CommandController } = require("./command-controller.js");

// xxxHonza: shouldn't be included here
const { logPerformanceTiming } = require("./performance-timing.js");
const { logXhr } = require("./xhr/xhr-spy.js");
require("./xhr/json-viewer.js");

// Side panels
const { DomSidePanel } = require("../dom/dom-side-panel.js");
const { CommandEditor } = require("./command-editor.js");

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper syntax otherwise Add-on SDK
// parser fires false exception.
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");

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
 * this.panel.hud.ui.proxy.webConsoleClient => {@WebConsoleClient}
 */
const ConsoleOverlay = Class(
/** @lends ConsoleOverlay */
{
  extends: BaseOverlay,

  searchable: true,

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("consoleOverlay.initialize;", options);

    this.toolbox = options.toolbox;
    this.panelFrame = options.panelFrame;

    // Bind event listeners to preserve |this| scope when handling events.
    this.onVariablesViewOpen = this.onVariablesViewOpen.bind(this);
    this.onVariablesViewFetched = this.onVariablesViewFetched.bind(this);
    this.onNewMessages = this.onNewMessages.bind(this);
    this.onSidebarCreated = this.onSidebarCreated.bind(this);
    this.onSidebarDestroyed = this.onSidebarDestroyed.bind(this);
    this.onSidebarToggle = this.onSidebarToggle.bind(this);
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
    let jsterm = this.getTerminal();
    jsterm.on("variablesview-open", this.onVariablesViewOpen);
    jsterm.on("variablesview-fetched", this.onVariablesViewFetched);
    jsterm.on("sidebar-created", this.onSidebarCreated);
    jsterm.on("sidebar-destroyed", this.onSidebarDestroyed);

    // Add listeners to {@WebConsoleFrame} object to hook message logging.
    hud.ui.on("new-messages", this.onNewMessages);

    this.setupSidePanels();
    this.updateSideSplitterTheme();

    // Initialize filter buttons.
    // xxxHonza: disable this for now, there is a weird exception during
    // the installation process.
    this.remoteFilter = new RemoteLoggingFilter(this);

    if (Theme.isFirebugActive()) {
      this.updateSearchBox(true);
      this.remoteFilter.update(true);
    }

    let win = this.getPanelWindow();
    let controller = new CommandController(this.chrome);
    win.controllers.insertControllerAt(0, controller);
  },

  destroy: function() {
    BaseOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("consoleOverlay.destroy;");

    if (this.listener) {
      this.listener.destroy();
    }

    let jsterm = this.getTerminal();
    if (!jsterm) {
      TraceError.sysout("consoleOverlay.destroy; ERROR jsterm is null!");
      return;
    }

    jsterm.off("variablesview-open", this.onVariablesViewOpen);
    jsterm.off("variablesview-fetched", this.onVariablesViewFetched);
    jsterm.off("sidebar-created", this.onSidebarCreated);
    jsterm.off("sidebar-destroyed", this.onSidebarDestroyed);

    // Remove listeners from {@WebConsoleFrame} object.
    let hud = this.panel.hud;
    hud.ui.off("new-messages", this.onNewMessages);
  },

  // Accessors

  getTerminal: function() {
    return this.panel && this.panel.hud ? this.panel.hud.jsterm : null;
  },

  getConsoleClient: function() {
    return this.panel && this.panel.hud && this.panel.hud.ui ?
      this.panel.hud.ui.webConsoleClient : null;
  },

  // Options Menu

  getOptionsMenuItems: function() {
    return [
      Menu.globalOptionMenu("console.timestampMessages.label",
        "devtools.webconsole.timestampMessages",
        "console.timestampMessages.tip"),
    ];
  },

  // Message Logging Hooks

  onNewMessages: function(topic, messages) {
    if (!this.remoteFilter) {
      return;
    }

    let someRemoteLogging = false;
    messages.forEach(msg => {
      this.onNewLog(msg);
      if (!someRemoteLogging)
        someRemoteLogging = msg.response && msg.response.category === "server";
    });

    if (someRemoteLogging) {
      this.remoteFilter.applyFilters();
    }
  },

  onNewLog: function(log) {
    Trace.sysout("consoleOverlay.onNewLog; update: " + log.update, log);

    let node = log.node;
    let msg = log.response;

    let hud = this.panel.hud;

    // xxxHonza: needs clean up
    if (msg && msg.category == "server") {
      node.setAttribute("category", "server");
      node.setAttribute("filter", "server" + msg.level);
    }

    // Support for Performance Timing
    // xxxHonza: needs clean up
    if (msg && (msg instanceof Messages.JavaScriptEvalOutput) &&
        msg.response && msg.response.result &&
        msg.response.result.class == "PerformanceTiming") {
      logPerformanceTiming(this, msg);
      return;
    }

    // Support for XHR Spy
    // xxxHonza: xhr-spy (as well as the performance-timing) module
    // should register a listener for new logs. This will allow
    // to wrap the entire xhr-spy features inside a module and make it
    // independent.
    if (logXhr(this, log)) {
      return;
    }

    let elementNodes = node.querySelectorAll(".kind-DOMNode");
    let category = node._messageObject ? node._messageObject.category : "";

    // Testing DOM modification
    /* let doc = node.ownerDocument;
    for (let element of elementNodes) {
      element.appendChild(doc.createTextNode("xxx"));
    } */
 },

  getSidePanels: function() {
    // xxxHonza: hide the DOM panel for now.
    return [CommandEditor/*, DomSidePanel*/];
  },

  setupSidePanels: function() {
    Trace.sysout("consoleOverlay.setupSidePanels;");

    // The panel is set in onReady and theme is applied sooner.
    if (!this.panel) {
      return;
    }

    // Make sure the Console panel side bar is created.
    // xxxHonza: we need better platform API.
    let jsterm = this.getTerminal();
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

  onSidebarCreated: function(eventId, sideBar) {
    Trace.sysout("consoleOverlay.onSidebarCreated;", sideBar);

    sideBar.on("show", this.onSidebarToggle);
    sideBar.on("hide", this.onSidebarToggle);

    // xxxHonza: the timeout must be there, see:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1056033
    sideBar._panelDoc.defaultView.setTimeout(() => {
      this.setupSidePanels();
      sideBar.select("variablesview");
    }, 200);
  },

  onSidebarDestroyed: function(eventId) {
    sideBar.off("show", this.onSidebarToggle);
    sideBar.off("hide", this.onSidebarToggle);
  },

  onSidebarToggle: function() {
    this.updateSideSplitterTheme();
  },

  toggleSidebar: function() {
    let jsterm = this.getTerminal();

    Trace.sysout("consoleOverlay.toggleSidebar; " + jsterm.sidebar);

    if (jsterm.sidebar) {
      jsterm.sidebar.toggle();
    } else {
      jsterm._createSidebar();
    }
  },

  // VariablesView Events

  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("consoleOverlay.onVariablesViewOpen; ", arguments);

    // Make sure the side-bar is visible.
    let jsterm = this.getTerminal();
    if (!isSideBarVisible(jsterm.sidebar)) {
      jsterm.sidebar.show();
    }

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

    let config = {
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
    let context = this.getContext();
    context.getCache().then(cache => {
      let provider = new DomProvider(cache);
      this.tree = new DomTree(provider);
      this.tree.replace(wrapper, {object: actor});
    });
  },

  // Theme

  applyTheme: function(win, oldTheme) {
    BaseOverlay.prototype.applyTheme.apply(this, arguments);

    if (win.location.href.indexOf("VariablesView.xul") == -1) {
      return;
    }

    loadSheet(win, "chrome://firebug/skin/variables-view.css", "author");
  },

  unapplyTheme: function(win, newTheme) {
    BaseOverlay.prototype.unapplyTheme.apply(this, arguments);

    if (win.location.href.indexOf("VariablesView.xul") == -1) {
      return;
    }

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
      this.updateSearchBox(true);

      if (this.remoteFilter) {
        this.remoteFilter.update(true);
      }

      this.toggleSideBar = new ToggleSideBarButton({
        panel: this,
        toolbar: doc.querySelector(".hud-console-filter-toolbar"),
      });
    });

    // Load theme stylesheets into the Console frame.
    loadSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/html.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/performance-timing.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/xhr-spy.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/json-viewer.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    Trace.sysout("consoleOverlay.onUnapplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    Theme.customizeSideBarSplitter(iframeWin, false);

    Win.loaded(iframeWin).then(doc => {
      this.updateSideSplitterTheme();
      this.updatePersistButton(false);
      this.updateSearchBox(false);

      if (this.remoteFilter) {
        this.remoteFilter.update(false);
      }
    });

    this.toggleSideBar.destroy();

    // Unload theme stylesheets from the Console frame.
    removeSheet(iframeWin, "chrome://firebug/skin/domTree.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/html.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/performance-timing.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/xhr-spy.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/json-viewer.css", "author");

    Theme.customizeSideBarSplitter(iframeWin, false);

    // Default themes don't have UI for manual side bar close (unlike
    // the Firebug theme), so make sure to close it if Firebug theme
    // is deactivated.
    let jsterm = this.getTerminal();
    if (jsterm && jsterm.sidebar) {
      jsterm.sidebar.hide();
    }
  },

  updateSideSplitterTheme: function() {
    let doc = this.getPanelDocument();
    let splitter = doc.querySelector(".devtools-side-splitter");

    // Do not mess the styling if Firebug theme isn't active.
    if (!Theme.isFirebugActive()) {
      splitter.removeAttribute("fb-collapsed");
      return;
    }

    // The HUD doesn't have to exist at this moment. It's available
    // when the 'ready' event is fired.
    let jsterm = this.getTerminal();
    if (!jsterm) {
      return;
    }

    // The splitter shouldn't be visible if the side bar is closed.
    let visible = isSideBarVisible(jsterm.sidebar);
    if (visible) {
      splitter.removeAttribute("fb-collapsed");
    } else {
      splitter.setAttribute("fb-collapsed", "true");
    }
  },

  /**
   * Create/Remove an additional 'Persist' button that is available
   * when the Firebug theme is active. The button can be used to
   * disable console-clear when the page is reloaded.
   */
  updatePersistButton: function(apply) {
    let doc = this.getPanelDocument();
    let toolbar = doc.querySelector(".hud-console-filter-toolbar");
    let clearButton = doc.querySelector(".webconsole-clear-console-button");

    if (apply) {
      let button = new ToolbarButton({
        id: "firebug-persist-console",
        toolbar: toolbar,
        _tabindex: parseInt(clearButton.getAttribute("tabindex") + 1, 10),
        referenceElement: clearButton.nextSibling,
        type: "checkbox",
        checked: Services.prefs.getBoolPref(persistPrefName),
        label: "firebug.menu.PersistConsole",
        tooltiptext: "firebug.menu.tip.PersistConsole",
        command: this.onPersist.bind(this)
      });
    } else {
      let persistButton = doc.getElementById("firebug-persist-console");
      if (persistButton) {
        persistButton.remove();
      }
    }
  },

  updateSearchBox: function(apply) {
    let doc = this.getPanelDocument();

    if (apply) {
      // Copy search box value from the original search box.
      let hudSearchBox = doc.querySelector(".hud-filter-box");
      this.chrome.searchBox.setValue(hudSearchBox.value);
    } else {
    }
  },

  onSearch: function(value) {
    let doc = this.getPanelDocument();

    // xxxHonza: The search box UI will be built-in at some point
    // see: https://bugzilla.mozilla.org/show_bug.cgi?id=1026479
    // As soon as the bug is fixed this code will change TESTME
    let hudSearchBox = doc.querySelector(".hud-filter-box");
    hudSearchBox.value = value;
    this.panel.hud.ui.adjustVisibilityOnSearchStringChange();
  },

  onShow: function() {
    BaseOverlay.prototype.onShow.apply(this, arguments);

    // Update the Console filter according to the current value
    // in the search box (in case it's been changed).
    // xxxHonza: this can be confusing (e.g. searching in HTML panel
    // and consequent switch to the Console pane can often result in an
    // empty Console panel). FIX ME
    /*let doc = this.getPanelDocument();
    let hudSearchBox = doc.querySelector(".hud-filter-box");
    let value = this.chrome.searchBox.getValue();
    if (hudSearchBox.value != value) {
      this.onSearch(value);
    }*/
  },

  // Commands

  clearConsole: function() {
    let doc = this.getPanelDocument();

    // Use the original test button to perform the actual clear action.
    // This button must be available in the UI (it's presence is tested
    // by test-console-clear test).
    let clearButton = doc.querySelector(".webconsole-clear-console-button");
    clearButton.click();
  },

  onPersist: function() {
    let value = Services.prefs.getBoolPref(persistPrefName);
    Services.prefs.setBoolPref(persistPrefName, !value);
  },

  /**
   * xxxHonza: this method is never executed!? FIXME
   *
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

    // Execute on the back end. TESTME
    this.panel.hud.jsterm.execute(expr, callback);
  }
});

// Helpers

// xxxHonza: could be implemented in {@BasePanel} or {@BaseOverlay}?
function isSideBarVisible(sidebar) {
  if (!sidebar) {
    return false;
  }

  return sidebar._tabbox.hasAttribute("hidden") ? false : true;
}

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
