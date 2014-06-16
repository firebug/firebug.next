/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { ConsoleListener } = require("./consoleListener.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { ToolbarButton } = require("./panelToolbar.js");
const { getSelectedTab } = require("sdk/tabs/utils");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

// Get the Messages object which holds the main classes of Messages
// used by the Web Console. Use helper 'path' otherwise Add-on SDK
// parser fires false exception.
var path = "devtools/webconsole/console-output";
const { Messages, Widgets } = devtools.require(path);

const Heritage = require("sdk/core/heritage");

/**
 * This object is responsible for {@WebConsole} panel customization
 */
const ConsoleOverlay = Class({
/** @lends ConsoleOverlay */
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("consoleOverlay.initialize;", options);

    let panel = options.panel;
    let doc = panel._frameWindow.frameElement.contentDocument;
    let win = doc.getElementById("devtools-webconsole");

    // xxxHonza: don't remove the light theme for now (to make all
    // icons properly visible). But we need to remove it as soon
    // as Firebug Console panel theme is done.
    //win.classList.remove("theme-light");
    win.classList.add("theme-firebug");

    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/webconsole.css"), "author");
    loadSheet(panel._frameWindow,
        self.data.url("firebug-theme/toolbars.css"), "author");

    this.listener = new ConsoleListener(options);

    // Test button in the toolbar
    let toolbar = doc.querySelector(".devtools-toolbarbutton-group");
    let netFilter = doc.querySelector("toolbarbutton[category='net']");

    var button = new ToolbarButton({
        toolbar: toolbar,
        label: "Custom Log",
        command: this.onCustomLog.bind(this),
        referenceElement: netFilter
    });
  },

  destroy: function() {
    this.listener.destroy();
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
function CustomMessage (msg) {
  Messages.Simple.call(this, msg, {
    category: "js"
  });
};

CustomMessage.prototype = Heritage.extend(Messages.Simple.prototype,
{
  render: function() {
    Trace.sysout("CustomMessage.render", this);

    let render = Messages.BaseMessage.prototype.render.bind(this);
    var element = this.document.createElement("div");
    element.innerHTML = "<a href='https://getfirebug.com/'>Firebug</a>";
    render().element.appendChild(element);
    return this;
  }
});

// Exports from this module
exports.ConsoleOverlay = ConsoleOverlay;
