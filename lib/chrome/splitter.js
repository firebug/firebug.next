/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");

// XUL Builder
const { SPLITTER } = Xul;

/**
 * TODO: description
 */
const Splitter = Class(
/** @lends Splitter */
{
  extends: EventTarget,

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    SPLITTER("id", "panelToolbarBox").build(options.parentNode);
  },
});

exports.Splitter = Splitter;
