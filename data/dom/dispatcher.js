/* See license.txt for terms of usage */

define(function(require, exports, module) {

var listeners = {};

/**
 * The application event emitter.
 * TODO: move to FBSDK
 */
var Dispatcher =
/** @lends Dispatcher */
{
  on: function(type, listener) {
    var listeners = observers(type);
    listeners.push(listener);
  },

  off: function(type, listener) {
    var listeners = observers(type);
    var index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  },

  once: function(type, listener) {
    var self = this;
    this.on(type, function observer(args) {
      self.off(type, observer);
      try {
        listener.apply(self, args);
      } catch (err) {
        Trace.sysout("Dispatcher.once; EXCEPTION " + err, err);
      }
    });
  },

  dispatch: function(type, args) {
    var results = [];

    var listeners = observers(type);
    for (var i=0; i<listeners.length; i++) {
      try {
        var listener = listeners[i];
        var result = listener(args);

        // Store all valid results into the result array. The only invalid
        // type is undefined (null, 0 can be treated as valid results in some
        // cases).
        if (typeof result != "undefined") {
          results.push(result);
        }
      } catch (err) {
        Trace.sysout("Dispatcher.emit; EXCEPTION " + err, err);
      }
    }

    return results;
  },
};

// Helpers

function observers(type) {
  return type in listeners ? listeners[type] : listeners[type] = [];
}

// Exports from this module
exports.Dispatcher = Dispatcher;
});
