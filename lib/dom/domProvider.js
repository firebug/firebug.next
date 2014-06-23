/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js");
const { defer } = require("sdk/core/promise");

// Implementation
function DomProvider(threadClient) {
  this.threadClient = threadClient;
}

/**
 * @provider This provider is responsible for fetching object properties
 * from the server side and providing data for UI widgets.
 *
 * TODO:
 * #1) the provider needs to use previews
 * #2) the name might change
 */
DomProvider.prototype =
/** @lends DomProvider */
{
  // Data Provider
  getChildren: function(object) {
    Trace.sysout("domProvider.getChildren;", object);

    let deferred = defer();
    let grip = object;

    if (object instanceof Property)
      grip = this.getValue(object);

    if (!grip.actor) {
      TraceError.sysout("domProvider.getChildren; no actor!", grip);
      return;
    }

    var client = this.threadClient.pauseGrip(grip);

    // Fetch properties from the server side.
    // xxxHonza: there should be properties cache in the way.
    client.getPrototypeAndProperties(aResponse => {
      let { ownProperties, prototype } = aResponse;

      // 'safeGetterValues' is new and isn't necessary defined on old actors.
      let safeGetterValues = aResponse.safeGetterValues || {};

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

      var result = Object.keys(ownProperties).map(key => {
        return new Property(key, ownProperties[key]);
      });

      Trace.sysout("domProvider.getChildren; response", {
        response: aResponse,
        result: result
      });

      deferred.resolve(result);
    });

    return deferred.promise;
  },

  hasChildren: function(object) {
    if (object instanceof Property) {
      let value = this.getValue(object);
      return typeof value == "object";
    }
  },

  getValue: function(object) {
    if (object instanceof Property)
      return object.value.value || object.value.getterValue;
  },

  getLabel: function(object) {
    if (object instanceof Property)
      return object.name;
  },

  // ID Provider. Used e.g. for tree persistence (list of expanded nodes).
  getId: function(object) {
  }
};

function Property(name, value) {
  this.name = name;
  this.value = value;
}

// Exports from this module
exports.DomProvider = DomProvider;
