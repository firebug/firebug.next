/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const { Cu, Ci } = require("chrome");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { defer, all, resolve } = require("sdk/core/promise");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { getSelectedTab } = require("sdk/tabs/utils");

// Firebug SDK
const { Dom } = require("firebug.sdk/lib/core/dom.js");
const { Content } = require("firebug.sdk/lib/core/content.js");
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { Rdp } = require("firebug.sdk/lib/core/rdp.js");
const { gDevTools, devtools, safeRequire } = require("firebug.sdk/lib/core/devtools.js");
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");
const { Menu } = require("firebug.sdk/lib/menu.js");
const { PanelToolbar } = require("firebug.sdk/lib/panel-toolbar.js");
const { ToolbarButton } = require("firebug.sdk/lib/toolbar-button.js");

// https://bugzilla.mozilla.org/show_bug.cgi?id=912121
const { Messages, Widgets } = safeRequire(devtools,
  "devtools/client/webconsole/console-output",
  "devtools/webconsole/console-output");

// Firebug
const { FBTrace, Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { ConsoleListener } = require("./console-listener.js");
const { Theme } = require("../chrome/theme.js");
const { Win } = require("../core/window.js");
const { ToggleSideBarButton } = require("../chrome/toggle-sidebar-button.js");
const { CommandController } = require("./command-controller.js");

// xxxHonza: shouldn't be included here
const { logPerformanceTiming } = require("./performance-timing.js");

// Side panels
const { CommandEditor } = require("./command-editor.js");

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper syntax otherwise Add-on SDK
// parser fires false exception.
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

// Constants
const persistPrefName = "devtools.webconsole.persistlog";

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
  extends: PanelOverlay,

  overlayId: "webconsole",
  searchable: true,

  // Initialization
  initialize: function(options) {
    PanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("ConsoleOverlay.initialize;", options);

    this.toolbox = options.toolbox;
    this.panelFrame = options.panelFrame;

    // Bind event listeners to preserve |this| scope when handling events.
    this.onVariablesViewOpen = this.onVariablesViewOpen.bind(this);
    this.onVariablesViewFetched = this.onVariablesViewFetched.bind(this);
    this.onNewMessages = this.onNewMessages.bind(this);
    this.onSidebarCreated = this.onSidebarCreated.bind(this);
    this.onSidebarDestroyed = this.onSidebarDestroyed.bind(this);
    this.onSidebarToggle = this.onSidebarToggle.bind(this);

    this.onContentMessage = this.onContentMessage.bind(this);
  },

  onBuild: function(options) {
    PanelOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("ConsoleOverlay.onBuild;", options.panel);

    let doc = this.getPanelDocument();
    let win = this.panelFrame.contentWindow;

    let ContentTrace = {
      sysout: (msg, obj) => {
        FBTrace.sysout(msg, obj);
      }
    };

    Content.exportIntoContentScope(win, ContentTrace, "Trace");
    Content.exportIntoContentScope(win, Locale, "Locale");

    // The configuration script is created dynamically since
    // we need to compute the base path.
    let configScript =
      "require.config({" +
      "  xhtml: true," +
      "  baseUrl: '" + self.data.url() + "'," +
      "  paths: {" +
      "    'react': './lib/react/react'," +
      "    'reps': '../node_modules/firebug.sdk/lib/reps'," +
      "  }" +
      "});" +
      "requirejs(['" + self.data.url() + "console/console-frame.js']);";

     let requireUrl = self.data.url("./lib/requirejs/require.js");

     // First, load RequireJS library. As soon as it's loaded, execute
     // also configuration script that loads the main module.
     Dom.loadScript(doc, requireUrl, event => {
       Dom.addScript(doc, "firebug-jsonviewer-config", configScript);
     });

    win.addEventListener("firebug/content/message",
      this.onContentMessage, true);
  },

  /**
   * Handle events coming from the tooltip iframe (content).
   */
  onContentMessage: function(event) {
    Trace.sysout("ConsoleOverlay.onContentMessage;", event);

    let { data } = event;
    let args = data.args;

    switch (data.type) {
    case "requestData":
      this.onRequestData(data.actor, args.method);
      break;
    case "resolveString":
      this.onGetLongString(args.stringGrip);
      break;
    }
  },

  onRequestData: function(actor, method) {
    this.requestData(actor, method).then(response => {
      this.postContentMessage("requestData", {
        method: method,
        response: response
      });
    });
  },

  onGetLongString: function(stringGrip) {
    this.getLongString(stringGrip).then(response => {
      this.postContentMessage("resolveString", {
        from: stringGrip.actor,
        response: response
      });
    });
  },

  /**
   * Send message to the content scope (tooltip's iframe)
   */
  postContentMessage: function(type, args) {
    let win = this.panelFrame.contentWindow;

    var data = {
      type: type,
      args: args,
    };

    data = Content.cloneIntoContentScope(win, data);

    Trace.sysout("ConsoleOverlay.postContentMessage; " + type, data);

    var event = new win.MessageEvent("firebug/chrome/message", {
      bubbles: true,
      cancelable: true,
      data: data,
    });

    win.dispatchEvent(event);
  },

  onReady: function(options) {
    PanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("ConsoleOverlay.onReady;", options);

    this.listener = new ConsoleListener(options);

    let hud = this.panel.hud;
    if (!hud) {
      TraceError.sysout("ConsoleOverlay.onReady; ERROR no hud!", this.panel);
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

    this.updateSideSplitterTheme();

    let win = this.getPanelWindow();
    let controller = new CommandController(this.chrome);
    win.controllers.insertControllerAt(0, controller);
  },

  destroy: function() {
    PanelOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("ConsoleOverlay.destroy;");

    if (this.listener) {
      this.listener.destroy();
    }

    let jsterm = this.getTerminal();
    if (!jsterm) {
      TraceError.sysout("ConsoleOverlay.destroy; ERROR jsterm is null!");
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
    messages.forEach(msg => {
      this.onNewLog(msg);
    });
  },

  onNewLog: function(log) {
    let node = log.node;
    let msg = log.response;

    let hud = this.panel.hud;

    // Support for Performance Timing
    // xxxHonza: needs clean up
    if (msg && (msg instanceof Messages.JavaScriptEvalOutput) &&
        msg.response && msg.response.result &&
        msg.response.result.class == "PerformanceTiming") {
      logPerformanceTiming(this, msg);
      return;
    }

    this.logXhr(log)

    let elementNodes = node.querySelectorAll(".kind-DOMNode");
    let category = node._messageObject ? node._messageObject.category : "";

    // Testing DOM modification
    /* let doc = node.ownerDocument;
    for (let element of elementNodes) {
      element.appendChild(doc.createTextNode("xxx"));
    } */
  },

  // XHR Spy

  logXhr: function(log) {
    // Support for XHR Spy
    // xxxHonza: xhr-spy (as well as the performance-timing) module
    // should register a listener for new logs. This will allow
    // to wrap the entire xhr-spy features inside a module and make it
    // independent.
    //if (logXhr(this, log)) {
    //  return;
    //}

    if (log.response._type != "NetworkEvent" &&
        log.response.type != "networkEventUpdate") {
      return;
    }

    let data = {
      type: "onXhrLog",
      args: log
    };

    let win = this.getPanelWindow();
    let event = new win.MessageEvent("firebug/chrome/message", {
      bubbles: true,
      cancelable: true,
      data: data,
    });

    win.dispatchEvent(event);
  },

  // Backend Data Accessors

  requestData: function(actor, method) {
    Trace.sysout("ConsoleOverlay.requestData; " + actor + ": " + method);

    if (!this.promises) {
      this.promises = {};
    }

    let key = actor + ":" + method;
    let promise = this.promises[key];
    if (promise) {
      return promise;
    }

    let deferred = defer();
    let client = this.getConsoleClient();

    let realMethodName = "get" + method.charAt(0).toUpperCase() +
      method.slice(1);

    if (!client[realMethodName]) {
      TraceError.sysout("ConsoleOverlay.getData; ERROR Unknown method! " +
        realMethodName);
      return;
    }

    client[realMethodName](actor, response => {
      deferred.resolve(response);
      delete this.promises[key];
    });

    return this.promises[key] = deferred.promise;
  },

  getLongString: function(stringGrip) {
    let client = this.getConsoleClient();
    return Rdp.getLongString(stringGrip, client);
  },

  // Side Panels

  getSidePanels: function() {
    return [CommandEditor];
  },

  setupSidePanels: function() {
    Trace.sysout("ConsoleOverlay.setupSidePanels;");

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

      //jsterm._createSidebar();
      //jsterm.sidebar.hide();
    }

    this.sidebarOverlay.sidebar = this.sidebar = jsterm.sidebar;

    this.sidebarOverlay.setupSidePanels();
  },

  // Sidebar Events

  onSidebarCreated: function(eventId, sideBar) {
    Trace.sysout("ConsoleOverlay.onSidebarCreated;", sideBar);

    sideBar.on("show", this.onSidebarToggle);
    sideBar.on("hide", this.onSidebarToggle);

    // xxxHonza: the timeout must be there, see:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1056033
    sideBar._panelDoc.defaultView.setTimeout(() => {
      this.setupSidePanels();
      sideBar.select("variablesview");
    }, 200);
  },

  onSidebarDestroyed: function(eventId, sideBar) {
    sideBar.off("show", this.onSidebarToggle);
    sideBar.off("hide", this.onSidebarToggle);
  },

  onSidebarToggle: function() {
    this.updateSideSplitterTheme();
  },

  toggleSidebar: function() {
    let jsterm = this.getTerminal();

    Trace.sysout("ConsoleOverlay.toggleSidebar; " + jsterm.sidebar);

    if (jsterm.sidebar) {
      jsterm.sidebar.toggle();
    } else {
      jsterm._createSidebar();
    }
  },

  // VariablesView Events

  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("ConsoleOverlay.onVariablesViewOpen; ", arguments);

    // Make sure the side-bar is visible.
    let jsterm = this.getTerminal();
    if (!isSideBarVisible(jsterm.sidebar)) {
      jsterm.sidebar.show();
    }
  },

  onVariablesViewFetched: function(eventId, aVar) {
    Trace.sysout("ConsoleOverlay.onVariablesViewFetched; ", arguments);
  },

  // Theme

  applyTheme: function(win, oldTheme) {
    PanelOverlay.prototype.applyTheme.apply(this, arguments);

    if (win.location.href.indexOf("VariablesView.xul") == -1) {
      return;
    }

    loadSheet(win, "chrome://firebug/skin/variables-view.css", "author");
  },

  unapplyTheme: function(win, newTheme) {
    PanelOverlay.prototype.unapplyTheme.apply(this, arguments);

    if (win.location.href.indexOf("VariablesView.xul") == -1) {
      return;
    }

    removeSheet(win, "chrome://firebug/skin/variables-view.css", "author");
  },

  onApplyTheme: function(iframeWin, oldTheme) {
    PanelOverlay.prototype.onApplyTheme.apply(this, arguments);

    Trace.sysout("ConsoleOverlay.onApplyTheme;", iframeWin);

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
    loadSheet(iframeWin, "chrome://firebug-firebug.sdk/skin/domTree.css", "author");
    loadSheet(iframeWin, "chrome://firebug-firebug.sdk/skin/tabs.css", "author");
    loadSheet(iframeWin, "chrome://firebug-firebug.sdk/skin/toolbar.css", "author");
    loadSheet(iframeWin, "chrome://firebug/skin/console.css", "author");
    loadSheet(iframeWin, self.data.url() + "console/xhr/css/xhr-spy.css", "author");
    loadSheet(iframeWin, self.data.url() + "console/xhr/css/html.css", "author");

    loadSheet(iframeWin, "chrome://firebug/skin/performance-timing.css", "author");
  },

  onUnapplyTheme: function(iframeWin, newTheme) {
    PanelOverlay.prototype.onUnapplyTheme.apply(this, arguments);

    Trace.sysout("ConsoleOverlay.onUnapplyTheme;", iframeWin);

    let doc = iframeWin.document;
    let win = doc.getElementById("devtools-webconsole");

    Theme.customizeSideBarSplitter(iframeWin, false);

    Win.loaded(iframeWin).then(doc => {
      this.updateSideSplitterTheme();
      this.updatePersistButton(false);
    });

    this.toggleSideBar.destroy();

    removeSheet(iframeWin, "chrome://firebug-firebug.sdk/skin/domTree.css", "author");
    removeSheet(iframeWin, "chrome://firebug-firebug.sdk/skin/tabs.css", "author");
    removeSheet(iframeWin, "chrome://firebug-firebug.sdk/skin/toolbar.css", "author");
    removeSheet(iframeWin, "chrome://firebug/skin/console.css", "author");
    removeSheet(iframeWin, self.data.url() + "console/xhr/css/xhr-spy.css", "author");
    removeSheet(iframeWin, self.data.url() + "console/xhr/css/html.css", "author");

    // Unload theme stylesheets from the Console frame.
    removeSheet(iframeWin, "chrome://firebug/skin/performance-timing.css", "author");

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
      let overlay = this.chrome.getOverlay(this.toolbox,
        "FirebugToolboxOverlay");
      overlay.searchBox.setValue(hudSearchBox.value);
    } else {
    }
  },

  onSearch: function(value) {
    this.search(".hud-filter-box", value);
  },

  onShow: function() {
    PanelOverlay.prototype.onShow.apply(this, arguments);

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
      TraceError.sysout("ConsoleOverlay.execute; ERROR no HUD!");
      return;
    }

    // Execute on the back end. TESTME
    this.panel.hud.jsterm.execute(expr, callback);
  }
});

// Helpers

// xxxHonza: could be implemented in {@PanelBase} or {@PanelOverlay}?
function isSideBarVisible(sidebar) {
  if (!sidebar) {
    return false;
  }

  return sidebar._tabbox.hasAttribute("hidden") ? false : true;
}

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
