/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { defer } = require("sdk/core/promise");
const { ObjectClient } = Cu.import("resource://gre/modules/devtools/dbg-client.jsm", {});

// Implementation

function GripProvider(target) {
  this.target = target;
}

/**
 */
GripProvider.prototype =
/** @lends GripProvider */
{
  /**
   * Sends "prototypeAndProperties" packet to get properties for
   * given grip (handle).
   *
   * @param {Grip} Grip object (remote reference to server side actor).
   */
  getPrototypeAndProperties: function(grip) {
    Trace.sysout("GripProvider.getPrototypeAndProperties;", grip);

    if (!grip.actor) {
      TraceError.sysout("GripProvider.getPrototypeAndProperties; no actor!", grip);
      return;
    }

    let deferred = defer();

    let client = new ObjectClient(this.target.client, grip);
    client.getPrototypeAndProperties(response => {
      mergeProperties(response);

      Trace.sysout("GripProvider.getPrototypeAndProperties; Response received:", {
        response: response,
      });

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
exports.GripProvider = GripProvider;
