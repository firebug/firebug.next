/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Panel } = require("dev/panel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Context } = require("../chrome/context.js");
const { emit } = require("sdk/event/core");

/**
 * This object is responsible for initialization and destruction of
 * the {$Context} object. In order to properly maintain {@Context}
 * life cycle it handles events emitted by the current debugging target.
 */
const TargetWatcher = Class(
/** @lends TargetWatcher */
{
  extends: EventTarget,

  context: null,

  // Initialization
  initialize: function(target) {
    Trace.sysout("targetWatcher.initialize;", this);

    this.target = target;

    target.on("will-navigate", this.onWillNavigate.bind(this));
    target.on("navigate", this.onNavigate.bind(this));
    target.on("visible", this.show.bind(this));
    target.on("hidden", this.hide.bind(this));
  },

  destroy: function() {
    this.destroyContext();
  },

  // Events
  onWillNavigate: function(eventId, event) {
    Trace.sysout("targetWatcher.onWillNavigate;", event);
  },

  onNavigate: function(eventId, event) {
    Trace.sysout("targetWatcher.onNavigate;", event);

    this.destroyContext();
    this.createContext();
  },

  show: function(eventId, target) {
    Trace.sysout("targetWatcher.show;");
  },

  hide: function(eventId, target) {
    Trace.sysout("targetWatcher.hide;");
  },

  // Context management
  createContext: function() {
    this.context = new Context({target: this.target});
    emit(this, "initContext", this.context);
    return this.context;
  },

  destroyContext: function() {
   if (!this.context)
     return;

   this.context.destroy();
   emit(this, "destroyContext", this.context);
   this.context = null;
  }
});

// Exports from this module
exports.TargetWatcher = TargetWatcher;
