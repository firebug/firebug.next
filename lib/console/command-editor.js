/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BaseSidePanel } = require("../chrome/baseSidePanel");
const { Class } = require("sdk/core/heritage");
const { Locale } = require("../core/locale.js");

/**
 * TODO: description
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

  setup: function({debuggee, frame, toolbox}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);
  },

  onReady: function(win) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);
  },
});

// Exports from this module
exports.CommandEditor = CommandEditor;
