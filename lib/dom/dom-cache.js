/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { defer } = require("sdk/core/promise");

// Implementation
function DomCache(threadClient) {
  this.threadClient = threadClient;
  this.cache = new Map();
}

/**
 * This object is responsible for caching RDP responses an optimizing
 * wire data transfer.
 *
 * TODO:
 * 1) Make sure to clean up the cache (or specific entries) when necessary.
 * It might happen the properties of an object change and we need to
 * re-request it.
 */
DomCache.prototype =
/** @lends DomCache */
{
  /**
   * Sends "prototypeAndProperties" packet to get properties for
   * given grip (handle).
   *
   * @param {Grip} Grip object (remote reference to server side actor).
   */
  getPrototypeAndProperties: function(grip) {
    Trace.sysout("domCache.getPrototypeAndProperties;", grip);

    if (!grip.actor) {
      TraceError.sysout("domCache.getPrototypeAndProperties; no actor!", grip);
      return;
    }

    let deferred = defer();

    // If the response is already in the cache resolve immediately.
    let cachedResponse = this.cache.get(grip.actor);
    if (cachedResponse) {
      Trace.sysout("domCache.getPrototypeAndProperties; " +
          "Response from cache:", { response: cachedResponse });

      deferred.resolve(cachedResponse);
      return deferred.promise;
    }

    // Fetch properties from the server side (asynchronously).
    let client = this.threadClient.pauseGrip(grip);
    client.getPrototypeAndProperties(response => {
      mergeProperties(response);

      Trace.sysout("domCache.getPrototypeAndProperties; Response received:", {
        response: response,
      });

      // Store the response in the cache.
      this.cache.set(grip.actor, response);

      deferred.resolve(response);
    });

    return deferred.promise;
  }
};

function mergeProperties(response) {
  let { ownProperties, prototype } = response;

  // 'safeGetterValues' is new and isn't necessary defined on old actors.
  let safeGetterValues = response.safeGetterValues || {};

  // Merge the safe getter values into one object such that we can use it
  // in VariablesView.
  for (let name of Object.keys(safeGetterValues)) {
    if (name in ownProperties) {
      let { getterValue, getterPrototypeLevel } = safeGetterValues[name];
      ownProperties[name].getterValue = getterValue;
      ownProperties[name].getterPrototypeLevel = getterPrototypeLevel;
    } else {
      ownProperties[name] = safeGetterValues[name];
    }
  }
}

// Exports from this module
exports.DomCache = DomCache;
