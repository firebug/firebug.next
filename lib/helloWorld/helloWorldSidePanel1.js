/* See license.txt for terms of usage */

"use strict";

const { BaseSidePanel } = require("../baseSidePanel");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("../core/trace.js");

/**
 * An example panel object. This object shows how to create a new panel
 * within the {@Toolbox} and customize its behavior through framework
 * hooks.
 */
const HelloWorldSidePanel1 = Class({
/** @lends HelloWorldSidePanel1 */
  extends: BaseSidePanel,

  label: "Panel 1",
  tooltip: "Side panel example 1",
  icon: "./icon-16.png",
  url: "./helloWorldSide1.html",

  setup: function({debuggee, frame}) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("HelloWorldSidePanel1.setup;", frame);
  },
});

// Exports from this module
exports.HelloWorldSidePanel1 = HelloWorldSidePanel1;
