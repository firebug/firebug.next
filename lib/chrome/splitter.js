/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

// Firebug SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Xul } = require("firebug.sdk/lib/core/xul.js");

// Constants
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
