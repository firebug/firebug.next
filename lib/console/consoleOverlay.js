/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./consoleListener.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { ToolbarButton } = require("../panelToolbar.js");
const { getSelectedTab } = require("sdk/tabs/utils");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Domplate } = require("../core/domplate.js");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { Dom } = require("../core/dom.js");

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper 'path' otherwise Add-on SDK
// parser fires false exception.
const path = "devtools/webconsole/console-output";
const { Messages, Widgets } = devtools.require(path);

const Heritage = require("sdk/core/heritage");

const { SPAN, A, domplate } = Domplate;

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * @overlay This object is responsible for {@WebConsole} panel customization.
 * The customization is applied when the Console panel is created and
 * sends 'ready' event.
 */
const ConsoleOverlay = Class(
/** @lends ConsoleOverlay */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("consoleOverlay.initialize;", options);

    let panel = options.panel;
    let frame = panel._frameWindow.frameElement;

    // Apply Firebug theme.
    let doc = frame.contentDocument;
    let win = doc.getElementById("devtools-webconsole");

    win.classList.remove("theme-light");
    win.classList.add("theme-firebug");

    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/webconsole.css"), "author");
    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/toolbars.css"), "author");

    this.listener = new ConsoleListener(options);

    // Test button in the toolbar
    let toolbar = doc.querySelector(".devtools-toolbarbutton-group");
    let netFilter = doc.querySelector("toolbarbutton[category='net']");

    let button = new ToolbarButton({
        toolbar: toolbar,
        label: "Custom Log",
        command: this.onCustomLog.bind(this),
        referenceElement: netFilter
    });

    let buttons = doc.querySelectorAll(".devtools-toolbarbutton");
    for (let button of buttons) {
      button.classList.remove("devtools-toolbarbutton");
      button.classList.remove("webconsole-filter-button");
    }

    // Hook variables view events.
    panel.hud.jsterm.on("variablesview-open", this.onVariablesViewOpen.bind(this));
    panel.hud.jsterm.on("variablesview-fetched", this.onVariablesViewFetched.bind(this));

    this.domProvider = new DomProvider();
    this.domTree = new DomTree();
  },

  destroy: function() {
    this.listener.destroy();
  },

  // VariablesView Events
  onVariablesViewOpen: function(eventId, view, options) {
    Trace.sysout("consoleOverlay.onVariablesViewOpen; ", arguments);

    let doc = view.document;
    let container = doc.querySelector("#variables");
    Dom.clearNode(container);

    // xxxHonza: we need to go over all the styles and use only what we need.
    // Necessary styles should be collected in domTree.css file.
    loadSheet(doc.defaultView, self.data.url("firebug-theme/dom.css"), "author");
    loadSheet(doc.defaultView, self.data.url("firebug-theme/console.css"), "author");
    loadSheet(doc.defaultView, self.data.url("firebug-theme/panel.css"), "author");
    loadSheet(doc.defaultView, self.data.url("firebug-theme/domTree.css"), "author");

    let box = doc.createElementNS(XHTML_NS, "div");
    container.appendChild(box);

    let objectClient = view.controller._getObjectClient(options.objectActor);

    // Fetch object properties and populate the {@DomTree}
    // xxxHonza: experimental code.
    // xxxHonza: the code should be done by a provider
    objectClient.getPrototypeAndProperties(aResponse => {
      let { ownProperties, prototype } = aResponse;
      // 'safeGetterValues' is new and isn't necessary defined on old actors.
      let safeGetterValues = aResponse.safeGetterValues || {};

      // Merge the safe getter values into one object such that we can use it
      // in VariablesView.
      for (let name of Object.keys(safeGetterValues)) {
        if (name in ownProperties) {
          let { getterValue, getterPrototypeLevel } = safeGetterValues[name];
          ownProperties[name].getterValue = getterValue;
          ownProperties[name].getterPrototypeLevel = getterPrototypeLevel;
        } else {
          ownProperties[name] = safeGetterValues[name];
        }
      }

      this.domTree.replace(box, {object: ownProperties});
    });
  },

  onVariablesViewFetched: function(eventId, aVar) {
    Trace.sysout("consoleOverlay.onVariablesViewFetched; ", arguments);
  },

  // Commands
  onCustomLog: function() {
    let browser = getMostRecentBrowserWindow();
    let tab = getSelectedTab(browser);

    function getWebConsole(tab) {
      // |tab| is the XUL tab for the page you want.
      let target = devtools.TargetFactory.forTab(tab);
      let toolbox = gDevTools.getToolbox(target);
      let panel = toolbox ? toolbox.getPanel("webconsole") : null;
      return panel ? panel.hud : null;
    }

    // Create the simplest message we can.
    let msg = new Messages.Extended("hello world", {
      category: "js",
      severity: "error",
    });

    // Add it to the output.
    let hud = getWebConsole(tab);
    //hud.ui.output.addMessage(msg);

    // Later you can use this message class.
    let msg = new CustomMessage();
    hud.ui.output.addMessage(msg);
  }
});

// Custom message renderer
function CustomMessage(msg) {
  Messages.Simple.call(this, msg, {
    category: "js"
  });
};


// Temporary template
var rep = domplate({},
{
  tag:
    SPAN({"class": "test"},
      A({"href": "google.com", onclick: "$onClick"},
        "Firebug"
      )
    ),

    onClick: function() {
      Trace.sysout("!!! clicked");
    }
});

CustomMessage.prototype = Heritage.extend(Messages.Simple.prototype,
{
  render: function() {
    Trace.sysout("CustomMessage.render", this);

    let render = Messages.BaseMessage.prototype.render.bind(this);

    let element = render().element;
    let result = rep.tag.append({}, element);
    Trace.sysout("rendered", result)

    return this;
  }
});

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
