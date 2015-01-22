/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { Arr } = require("./core/array.js");

var listeners = {};
var modules = [];

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

        // Store all valid results into the result array. The only invalid
        // type is undefined (null, 0 can be treated as valid results in some
        // cases).
        if (typeof result != "undefined") {
          results.push(result);
        }
      } catch (err) {
        TraceError.sysout("target.emit; EXCEPTION " + err, err);
      }
    }

    // Yet dispatch to all registered modules.
    let moreResults = this.dispatch(type, args);
    results.push.apply(results, moreResults);

    return results;
  },

  /**
   * TODO: docs
   */
  dispatch: function(name, args) {
    let results = [];

    for (let i=0; i<modules.length; i++) {
      let module = modules[i];
      if (!module[name]) {
        continue;
      }

      try {
        var result = module[name].apply(module, args);

        if (typeof result != "undefined") {
          results.push(result);
        }
      }
      catch (err) {
        TraceError.sysout("target.dispatch; EXCEPTION " + err, err);
      }
    }

    return results;
  },

  // Modules

  register: function(module) {
    modules.push(module);
  },

  unregister: function(module) {
    Arr.remove(module);
  }
}

// Helpers

function observers(type) {
  return type in listeners ? listeners[type] : listeners[type] = [];
}

// Exports from this module
exports.target = Target;
