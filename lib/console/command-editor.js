/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BaseSidePanel } = require("../chrome/baseSidePanel");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");
const { PanelToolbar } = require("../chrome/panelToolbar.js");

/**
 * This object is responsible for logic related to a command editor (known
 * also as multiline command line). This editor is available in the Console
 * panel and can be used to execute JS code.
 */
const CommandEditor = Class(
/** @lends CommandEditor */
{
  extends: BaseSidePanel,

  id: "commandEditor",
  label: Locale.$STR("commandEditor.tab.label"),
  tooltip: Locale.$STR("commandEditor.tab.tip"),
  icon: "./icon-16.png",
  url: "./command-editor.html",

  // Initialization

  setup: function({debuggee, frame, toolbox}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("commandEditor.setup");

    this.onMessage = this.onMessage.bind(this);

    this.toolbar = new PanelToolbar({parentNode: frame.parentNode });
    this.toolbar.createItems(this.getPanelToolbarButtons());
  },

  onReady: function(options) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("commandEditor.onReady");

    this.window = options.window;

    // Setup communication channel with the frame (type == content).
    Cu.exportFunction(this.onMessage, this.window, {
      defineAs: "sendCommand"
    });
  },

  onMessage: function(event) {
    Trace.sysout("commandEditor.onMessage; From CM " + event, event);

    switch (event.type) {
      case "evaluate":
        this.owner.execute(event.value);
        break;
      case "escape":
        break;
    }
  },

  // Toolbar

  getPanelToolbarButtons: function() {
    var buttons = [];

    // xxxHonza: localization
    buttons.push({
      id: "firebug-commandeditor-run",
      label: "Run",
      command: this.onRun.bind(this)
    });

    buttons.push({
      id: "firebug-commandeditor-clear",
      label: "Clear",
      command: this.onClear.bind(this)
    });

    buttons.push({
      id: "firebug-commandeditor-copy",
      label: "Copy",
      command: this.onCopy.bind(this)
    });

    buttons.push({
      id: "firebug-commandeditor-prettyprint",
      label: "Pretty Print",
      command: this.onPrettyPrint.bind(this)
    });

    return buttons;
  },

  onRun: function() {
  },

  onClear: function() {
  },

  onCopy: function() {
  },

  onPrettyPrint: function() {
  },
});

// Exports from this module
exports.CommandEditor = CommandEditor;
