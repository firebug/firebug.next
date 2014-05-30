/* See license.txt for terms of usage */

"use strict";

const { Trace } = require("./trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

/**
 * This object represents a context that is responsible for collecting
 * data about the current target (e.g. a web page). You can see this
 * object as a Document (see Document-View design pattern).
 * 
 * TODO: hook create/destroy to framework events
 */
const TabContext = Class({
  extends: EventTarget,

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("tabContext.initialize;");
  },
});

// Exports from this module
exports.TabContext = TabContext;
