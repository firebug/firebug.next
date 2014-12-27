/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("./core/trace.js").get(module.id);

var listeners = {};

/**
 * Global event-target that is used to fire global Firebug events
 * related to initialization and shutdown.
 */
var Target = {
  on: function(type, listener) {
    let listeners = observers(type);
    listeners.push(listener);
  },

  off: function(type, listener) {
    let listeners = observers(type);
    let index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  },

  once: function(type, listener) {
    let self = this;
    this.on(type, function observer(args) {
      self.off(type, observer);
      try {
        listener.apply(self, args);
      } catch (err) {
        TraceError.sysout("target.once; EXCEPTION " + err, err);
      }
    });
  },

  emit: function(type, args) {
    let results = [];

    let listeners = observers(type);
    for (let i=0; i<listeners.length; i++) {
      try {
        let listener = listeners[i];
        let result = listener.apply(this, args);

        if (result) {
          results.push(result);
        }
      } catch (err) {
        TraceError.sysout("target.emit; EXCEPTION " + err, err);
      }
    }

    return results;
  },
}

// Helpers

function observers(type) {
  return type in listeners ? listeners[type] : listeners[type] = [];
}

// Exports from this module
exports.target = Target;
