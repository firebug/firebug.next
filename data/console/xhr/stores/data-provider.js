/* See license.txt for terms of usage */

define(function(require, exports, module) {

/**
 * Map of pending requests.
 */
var requests = new Map();

/**
 * This object implements basic message exchange with the chrome scope.
 * It's used to request XHR data from the backend.
 */
var DataProvider =
/** @lends DataProvider */
{
  resolveString: function(stringGrip) {
    var type = "resolveString";
    var key = stringGrip.actor + ":" + type;

    return this.postMessage(key, stringGrip.actor, type, {
      stringGrip: stringGrip
    });
  },

  requestData: function(actor, method) {
    var type = "requestData";
    var key = actor + ":" + method;

    return this.postMessage(key, actor, type, {
      method: method
    });
  },

  postMessage: function(key, actor, type, args) {
    Trace.sysout("DataProvider.postMessage; To " + actor + ": " +
      type, args);

    var entry = requests.get(key);
    if (entry) {
      return entry.promise;
    }

    var promise = new Promise((resolve, reject) => {
      requests.set(key, {
        resolve: resolve,
        reject: reject
      });
    });

    requests.get(key).promise = promise;

    var data = {
      type: type,
      actor: actor,
      args: args
    };

    var event = new MessageEvent("firebug/content/message", {
      bubbles: true,
      cancelable: true,
      data: data,
    });

    dispatchEvent(event);

    return promise;
  },

  onMessage: function(event) {
    var data = event.data;
    var type = data.type;
    var args = data.args;

    Trace.sysout("DataProvider.onMessage; " + type, event);

    var key;

    switch (type) {
    case "requestData":
      key = args.response.from + ":" + args.method;
      break;
    case "resolveString":
      key = args.from + ":" + type;
      break;
    default:
      return;
    }

    var entry = requests.get(key);
    requests.delete(key);

    entry.resolve(args);
  },
};

addEventListener("firebug/chrome/message", DataProvider.onMessage);

// Exports from this module
exports.DataProvider = DataProvider;
});
