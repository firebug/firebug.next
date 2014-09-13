/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

/**
 * This object represents a context that is responsible for collecting
 * data about the current target (e.g. a web page). You can see this
 * object as a Document (see Document-View design pattern).
 * 
 * TODO: hook create/destroy to framework events
 */
const Context = Class(
/** @lends Context */
{
  extends: EventTarget,

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    this.chrome = options.chrome;
    this.target = options.chrome.toolbox.target;
    this.browserDoc = this.chrome.getBrowserDoc();
    this.url = this.target.url;

    Trace.sysout("context.initialize; " + this.getTitle());
  },

  destroy: function() {
    Trace.sysout("context.destroy; " + this.getTitle());
  },

  getTitle: function() {
    return this.url;
  },

  getToolbox: function() {
    return this.chrome.toolbox;
  },

  getChrome: function() {
    return this.chrome;
  },

  getBrowserDoc: function() {
    return this.browserDoc;
  }
});

// Exports from this module
exports.Context = Context;
