/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { BaseSidePanel } = require("../chrome/baseSidePanel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

/**
 * An example panel object. This object shows how to create a new panel
 * within the {@Toolbox} and customize its behavior through framework
 * hooks.
 */
const HelloWorldSidePanel2 = Class(
/** @lends HelloWorldSidePanel2 */
{
  extends: BaseSidePanel,

  id: "panel2",
  label: "Panel 2",
  tooltip: "Side panel example 2",
  icon: "./icon-16.png",
  url: "./helloWorldSide2.html",

  setup: function({debuggee, frame}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("HelloWorldSidePanel2.setup;", frame);
  },
});

// Exports from this module
exports.HelloWorldSidePanel2 = HelloWorldSidePanel2;
