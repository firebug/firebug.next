/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js");

// Implementation
function DomProvider(cache) {
  this.cache = cache;
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
  /**
   * Fetches properties from the backend. These properties might be
   * displayed as child objects in e.g. a tree UI widget.
   *
   * @returns {Promise} Returns a promise that is resolved to a list of
   * children.
   */
  getChildren: function(object) {
    Trace.sysout("domProvider.getChildren;", object);

    let grip = object;

    if (object instanceof Property)
      grip = this.getValue(object);

    if (!grip || !grip.actor) {
      TraceError.sysout("domProvider.getChildren; ERROR invalid grip!", grip);
      return;
    }

    // Fetch properties for given grip from the server side.
    return this.cache.getPrototypeAndProperties(grip).then(response => {
      let ownProperties = response.ownProperties;

      // Compute list of requested children.
      let children = Object.keys(ownProperties).map(key => {
        return new Property(key, ownProperties[key]);
      });

      function sortName(a, b) { return a.name > b.name ? 1 : -1; }
      children.sort(sortName);

      Trace.sysout("domProvider.getChildren; Response received:", {
        response: response,
        children: children
      });

      return children;
    });
  },

  hasChildren: function(object) {
    if (object instanceof Property) {
      let value = this.getValue(object);
      return (value && value.type == "object");
    }
  },

  getValue: function(object) {
    if (object instanceof Property) {
      let value = object.value;
      return (typeof value.value != "undefined") ?  value.value :
        value.getterValue;
    }
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
