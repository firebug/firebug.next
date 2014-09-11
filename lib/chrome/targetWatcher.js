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
 *
 * Various context related events are fired on the {@Chrome} object,
 * so the {@TargetWatcher} is rather an internal object that should not
 * be used by the outside world.
 *
 * Context related events:
 * 'initContext' - A new context for debugging target (e.g. tab) was created.
 * 'destroyContext' - An existing context was destroyed.
 * 'showContext' - An existing context is now active (e.g. the associated
 *                 browser tab has been selected by the user).
 * 'hideContext' - An existing context is deactivated (e.g. the associated
 *                 browser tab has been unselected by the user).
 */
const TargetWatcher = Class(
/** @lends TargetWatcher */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("targetWatcher.initialize;", this);

    this.chrome = options.chrome;
    this.target = options.chrome.toolbox.target;

    this.onWillNavigate = this.onWillNavigate.bind(this);
    this.onNavigate = this.onNavigate.bind(this);
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);

    // Add listeners
    this.target.on("will-navigate", this.onWillNavigate);
    this.target.on("navigate", this.onNavigate);
    this.target.on("visible", this.show);
    this.target.on("hidden", this.hide);

    this.createContext();
  },

  destroy: function() {
    Trace.sysout("targetWatcher.destroy;", this);

    // Remove listeners
    this.target.off("will-navigate", this.onWillNavigate);
    this.target.off("navigate", this.onNavigate);
    this.target.off("visible", this.show);
    this.target.off("hidden", this.hide);

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
    Trace.sysout("targetWatcher.show;", target);

    emit(this.chrome, "showContext", this.context);
  },

  hide: function(eventId, target) {
    Trace.sysout("targetWatcher.hide;", target);

    emit(this.chrome, "hideContext", this.context);
  },

  // Context management
  createContext: function() {
    this.context = new Context({chrome: this.chrome});

    emit(this.chrome, "initContext", this.context);

    return this.context;
  },

  destroyContext: function() {
   if (!this.context)
     return;

   emit(this.chrome, "destroyContext", this.context);

   this.context.destroy();
   this.context = null;
  },

  getContext: function() {
    return this.context;
  }
});

// Exports from this module
exports.TargetWatcher = TargetWatcher;
