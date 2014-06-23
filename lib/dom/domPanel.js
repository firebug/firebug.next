/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");
var main = require("../main.js");

const { Cu, Ci } = require("chrome");
const { BasePanel } = require("../basePanel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js");
const { Tool } = require("dev/toolbox");
const { Locale } = require("../core/locale.js");
const { DomTree } = require("../dom/domTree.js");
const { loadSheet } = require("sdk/stylesheet/utils");

/**
 * @panel
 */
const DomPanel = Class({
/** @lends DomPanel */
  extends: BasePanel,

  label: Locale.$STR("domPanelTitle"),
  tooltip: "DOM panel example",
  icon: "./icon-16.png",
  url: "./dom.html",

  setup: function({debuggee, frame}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("DomPanel.setup;", frame);
  },

  onReady: function() {
    Trace.sysout("DomPanel.onReady;", this);

    var win = this.frame.contentWindow;
    var doc = win.document;

    loadSheet(win, self.data.url("firebug-theme/domTree.css"), "author");

    this.domTree = new DomTree(null);
    this.domTree.replace(doc.body, {object: this});
  },
});

// Panel registration
const domTool = new Tool({
  name: "DOM Tool",
  panels: {
    domPanel: DomPanel
  }
});

// Exports from this module
exports.DomPanel = DomPanel;
