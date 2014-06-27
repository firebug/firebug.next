/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Panel } = require("../sdk/panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("../core/trace.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 */
const BaseSidePanel = Class({
/** @lends BaseSidePanel */
  extends: Panel,

  onReady: function() {
    Trace.sysout("BaseSidePanel.onReady;", this);
  },

  onLoad: function() {
    Trace.sysout("BaseSidePanel.onLoad;", this);
  },

  setup: function({frame}) {
    Trace.sysout("BaseSidePanel.setup;", arguments);
  },

  getPanelToolbarButtons: function() {
    return null;
  },

  show: function() {
    Trace.sysout("BaseSidePanel.show;");
  },

  getOptionsMenuItems: function() {
    return [];
  },

  supportsObject: function() {
    return false;
  }
});

// Exports from this module
exports.BaseSidePanel = BaseSidePanel;
