/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/baseOverlay.js");
const { Menu } = require("../chrome/menu.js");

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Network panel.
 */
const NetworkOverlay = Class(
/** @lends NetworkOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    Trace.sysout("NetworkOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("NetworkOverlay.onReady;", options);
  },

  destroy: function() {
  },

  getOptionsMenuItems: function() {
    return [
      this.disableCacheOption(),
      "-",
      Menu.optionMenu("net.option.Show_Paint_Events",
        "netShowPaintEvents",
        "net.option.tip.Show_Paint_Events"),
      Menu.optionMenu("net.option.Show_BFCache_Responses",
        "netShowBFCacheResponses",
        "net.option.tip.Show_BFCache_Responses")
    ];
  },

  disableCacheOption: function() {
    return {
      label: "net.option.Disable_Browser_Cache",
      type: "checkbox",
      checked: false,
      tooltiptext: "net.option.tip.Disable_Browser_Cache",
      command: function() {
        Trace.sysout("TODO: FIX ME");
      }
    };
  }
});

// Exports from this module
exports.NetworkOverlay = NetworkOverlay;
