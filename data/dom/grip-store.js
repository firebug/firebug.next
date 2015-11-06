/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Implementation
function GripStore(view) {
  this.view = view;

  this.onChromeEvent = this.onChromeEvent.bind(this);
  addEventListener("firebug.sdk/chrome-event", this.onChromeEvent);

  this.cache = new Map();
  this.requests = new Map();
}

/**
 * Stores properties for grips. If specified grip properties are not
 * in the store yet they are asynchronously requested from the backend.
 * TODO: move to FBSDK
 */
GripStore.prototype =
/** @lends GripStore */
{
  // Handle chrome messages

  onChromeEvent: function(event) {
    var data = event.data;
    var method = data.method;
    var args = data.args;

    if (method == "onPrototypeAndProperties") {
      data.processed = true;
      this.onPrototypeAndProperties(args);
    }
  },

  // Grip Properties Provider

  getPrototypeAndProperties: function(grip) {
    Trace.sysout("GripStore.getPrototypeAndProperties; for: " +
      grip.actor, grip);

    if (!grip || !grip.actor) {
      Trace.sysout("GripStore.getPrototypeAndProperties; " +
        " ERROR no such actor!", grip);
      throw(new Error("ERROR no such actor!"));
    }

    var entry = this.requests.get(grip.actor);
    if (entry) {
      return entry.promise;
    }

    // If the response is already in the cache resolve immediately.
    var response = this.cache.get(grip.actor);
    if (response) {
      return response.ownProperties;
    }

    // Allocate new entry in the cache and fetch properties from the
    // server side (asynchronously).
    grip = JSON.parse(JSON.stringify(grip));
    this.cache.set(grip.actor, grip);
    this.view.postChromeMessage("getPrototypeAndProperties", grip);

    var promise = new Promise((resolve, reject) => {
      this.requests.set(grip.actor, {
        resolve: resolve,
        reject: reject
      });
    });

    this.requests.get(grip.actor).promise = promise;

    return promise;
  },

  onPrototypeAndProperties: function(response) {
    response = JSON.parse(response);

    // The cache entry should be already allocated.
    var grip = this.cache.get(response.from);
    if (!grip) {
      return;
    }

    // Properly deal with getters.
    mergeProperties(response);

    // Copy all response props into the cache entry.
    var props = Object.getOwnPropertyNames(response);
    for (var name of props) {
      grip[name] = response[name];
    }

    Trace.sysout("GripStore.onPrototypeAndProperties; PACKET from: " +
      response.from, grip);

    var entry = this.requests.get(response.from);
    this.requests.delete(response.from);

    entry.promise.then(props => {
      this.view.refresh(grip);
    })

    entry.resolve(grip.ownProperties);
  },
};

function mergeProperties(response) {
  var { ownProperties, prototype } = response;

  // 'safeGetterValues' is new and isn't necessary defined on old actors.
  var safeGetterValues = response.safeGetterValues || {};

  // Merge the safe getter values into one object such that we can use it
  // in VariablesView.
  for (var name of Object.keys(safeGetterValues)) {
    if (name in ownProperties) {
      var { getterValue, getterPrototypeLevel } = safeGetterValues[name];
      ownProperties[name].getterValue = getterValue;
      ownProperties[name].getterPrototypeLevel = getterPrototypeLevel;
    } else {
      ownProperties[name] = safeGetterValues[name];
    }
  }
}

// Exports from this module
exports.GripStore = GripStore;
});
