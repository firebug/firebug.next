/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { BaseSidePanel } = require("../chrome/baseSidePanel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

/**
 * @panel This object represents 'Selectors' side panel within the
 * Style Editor panel.
 */
const SelectorPanel = Class(
/** @lends SelectorPanel */
{
  extends: BaseSidePanel,

  // xxxHonza: localization
  id: "selectorPanel",
  label: "Selectors",
  tooltip: "Displays elements matching a CSS selector",
  icon: "./icon-16.png",
  url: "./selector-panel.html",

  setup: function({debuggee, frame}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("selectorPanel.setup;", frame);
  },
});

// Exports from this module
exports.SelectorPanel = SelectorPanel;
