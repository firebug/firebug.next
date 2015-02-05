/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

var self = require("sdk/self");
var main = require("../main.js");

const { Cu, Ci } = require("chrome");
const { BaseSidePanel } = require("../chrome/base-side-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Tool } = require("dev/toolbox");
const { Locale } = require("../core/locale.js");
const { DomTree } = require("../dom/dom-tree.js");
const { DomProvider } = require("../dom/dom-provider.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { defer } = require("sdk/core/promise");

/**
 * @panel This object implements a main DOM panel. It displays structure
 * of the current document. The panel might be converted into DevTools SDK
 * example showing how to render remote objects (grips) by using repository
 * of registered templates {@Reps}.
 */
const DomSidePanel = Class(
/** @lends DomSidePanel */
{
  extends: BaseSidePanel,

  id: "domSidePanel",
  label: Locale.$STR("dom.panel.title"),
  tooltip: Locale.$STR("dom.panel.tip"),
  icon: "./icon-16.png",
  url: "./dom/dom-side.html",

  setup: function({frame, toolbox}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("domSidePanel.setup;", arguments);
  },

  onReady: function(options) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("domSidePanel.onReady;");
  },

  supportsObject: function() {
    // xxxHonza: FIX ME
    return true;
  },

  refresh: function(actor) {
    Trace.sysout("domSidePanel.refresh; actor:", actor);

    let context = this.getContext();
    context.getCache().then(cache => {
      Trace.sysout("domSidePanel.refresh; cache:", cache);

      // xxxHonza: theme applying and switch must be centralized
      // (see also theme-switcher)
      let win = this.panelFrame.contentWindow;
      loadSheet(win, "chrome://firebug/skin/domTree.css", "author");

      let panelNode = win.document.body;

      let provider = new DomProvider(cache);
      this.tree = new DomTree(provider);
      this.tree.replace(panelNode, {object: actor});
    });
  },
});

// Exports from this module
exports.DomSidePanel = DomSidePanel;
