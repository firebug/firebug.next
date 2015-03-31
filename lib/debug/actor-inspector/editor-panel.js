/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { BaseSidePanel } = require("../../chrome/base-side-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Locale } = require("../../core/locale.js");

/**
 * @panel TODO docs
 */
const EditorPanel = Class(
/** @lends EditorPanel */
{
  extends: BaseSidePanel,

  label: Locale.$STR("actorInspector.panel.editor.title"),
  tooltip: Locale.$STR("actorInspector.panel.editor.tip"),
  icon: "./icon-16.png",
  url: "./actor-inspector/editor.html",

  setup: function({debuggee, frame}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("editorPanel.setup;", frame);
  },

  onMessage: function(msg) {
    Trace.sysout("editrPanel.onMessage;", msg);

    let data = msg.data;
    switch (data.type) {
    case "send-new-packet":
      this.onSendNewPacket(data.object);
      break
    }
  },

  onSendNewPacket: function(packet) {
    this.chrome.toolbox.target.client._transport.send(JSON.parse(packet));
  }

});

// Exports from this module
exports.EditorPanel = EditorPanel;
