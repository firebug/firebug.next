/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { BaseSidePanel } = require("../../chrome/base-side-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Tool } = require("dev/toolbox");
const { Locale } = require("../../core/locale.js");

/**
 * @panel
 */
const PacketSidePanel = Class(
/** @lends PacketSidePanel */
{
  extends: BaseSidePanel,

  id: "packetSidePanel",
  label: Locale.$STR("actorInspector.panel.packet.title"),
  tooltip: Locale.$STR("actorInspector.panel.packet.tip"),
  icon: "./icon-16.png",
  url: "./actor-inspector/packet-side-content.html",

  setup: function({frame, toolbox}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("PacketSidePanel.setup;", arguments);
  },

  onReady: function(options) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("PacketSidePanel.onReady;");
  },

  onMessage: function(msg) {
  },

  // Selection

  supportsObject: function() {
    return true;
  },

  refresh: function(actor) {
    Trace.sysout("PacketSidePanel.refresh; actor:", actor);
  },
});

// Exports from this module
exports.PacketSidePanel = PacketSidePanel;
