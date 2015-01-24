/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BaseSidePanel } = require("../chrome/base-side-panel.js");
const { Events } = require("../core/events.js");
const { Locale } = require("../core/locale.js");
const { Str } = require("../core/string.js");
const { PanelToolbar } = require("../chrome/panel-toolbar.js");
const { PrettyPrint } = require("./pretty-print.js");
const { Class } = require("sdk/core/heritage");
const Clipboard = require("sdk/clipboard");

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
  url: "./command-editor/command-editor.html",

  // Initialization

  setup: function({debuggee, frame, toolbox}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("commandEditor.setup;");

    this.onMessage = this.onMessage.bind(this);
    this.onRun = this.onRun.bind(this);

    this.toolbar = new PanelToolbar({parentNode: frame.parentNode });
    this.toolbar.createItems(this.getPanelToolbarButtons());
  },

  onReady: function(options) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("commandEditor.onReady;");

    this.window = XPCNativeWrapper.unwrap(options.window);

    // Setup communication channel with the frame (type == content).
    // The content (panel frame) can send messages to this panel object
    // through 'sendMessage' method. The message are handled by
    // 'onMessage' below.
    Cu.exportFunction(this.onMessage, this.window, {
      defineAs: "sendMessage"
    });
  },

  onMessage: function(event) {
    Trace.sysout("commandEditor.onMessage; From CM " + event, event);

    switch (event.type) {
      case "evaluate":
        this.doRun();
        break;
      case "escape":
        break;
    }
  },

  // Toolbar

  getPanelToolbarButtons: function() {
    let buttons = [];

    // xxxHonza: TESTME (all the commands)
    buttons.push({
      id: "firebug-commandeditor-run",
      label: "commandEditor.run.label",
      tooltiptext: "commandEditor.run.tip",
      command: this.onRun.bind(this)
    });

    buttons.push({
      id: "firebug-commandeditor-clear",
      label: "commandEditor.clear.label",
      tooltiptext: "commandEditor.clear.tip",
      command: this.onClear.bind(this)
    });

    buttons.push({
      id: "firebug-commandeditor-prettyprint",
      label: "commandEditor.prettyPrint.label",
      tooltiptext: "commandEditor.prettyPrint.tip",
      command: this.onPrettyPrint.bind(this)
    });

    buttons.push({
      id: "firebug-commandeditor-copy",
      label: "commandEditor.copy.label",
      tooltiptext: "commandEditor.copy.tip",
      type: "menu-button",
      command: this.onCopy.bind(this),
      items: [{
        id: "firebug-commandeditor-copyas-bookmarklet",
        label: "commandEditor.copyAsBookmarklet.label",
        tooltiptext: "commandEditor.copyAsBookmarklet.tip",
        command: this.onCopyAsBookmarklet.bind(this)
      }],
    });

    return buttons;
  },

  doRun: function() {
    let editor = this.window.editor;
    let selection = editor.getSelection();
    let expression = selection ? selection : editor.getValue();
    this.owner.execute(expression);
  },

  // Command Handlers

  onRun: function() {
    this.doRun();
  },

  onClear: function() {
    this.window.editor.setValue("");
  },

  onCopy: function() {
    let value = this.window.editor.getValue();
    Clipboard.set(value, "text");
  },

  onCopyAsBookmarklet: function(event) {
    // xxxHonza: This needs escaping, and stripNewLines is exactly the
    // wrong thing to do when it comes to JavaScript.
    // (see also the original implementation).
    let value = this.window.editor.getValue();
    let expr = "javascript: " + value.replace(/[\r\n]/gm, " ");
    Clipboard.set(expr, "text");
    Events.cancelEvent(event);
  },

  onPrettyPrint: function() {
    let value = this.window.editor.getValue();
    PrettyPrint.run(value).then(value => {
      this.window.editor.setValue(value);
    });
  },
});

// Exports from this module
exports.CommandEditor = CommandEditor;
