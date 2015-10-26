/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Implementation
function DomProvider(store) {
  this.store = store;
}

/**
 * This object provides data for the tree displayed in the tooltip
 * content.
 * TODO: move to FBSDK
 */
DomProvider.prototype =
/** @lends DomProvider */
{
  /**
   * Fetches properties from the backend. These properties might be
   * displayed as child objects in e.g. a tree UI widget.
   */
  getChildren: function(object) {
    var value = this.getValue(object);
    Trace.sysout("DomProvider.getChildren; for: " +
      value.actor, object);

    var grip = object;

    if (object instanceof Property) {
      grip = this.getValue(object);
    }

    if (!grip || !grip.actor) {
      Trace.sysout("DomProvider.getChildren; ERROR invalid grip!", grip);
      return;
    }

    var properties = this.store.getPrototypeAndProperties(grip);
    if (properties instanceof Promise) {
      return properties;
    }

    // Compute list of requested children.
    var children = Object.keys(properties).map(key => {
      return new Property(key, properties[key]);
    });

    function sortName(a, b) {
      // Display non-enumerable properties at the end.
      if (!a.value.enumerable && b.value.enumerable) {
        return 1;
      }
      if (a.value.enumerable && !b.value.enumerable) {
        return -1;
      }

      return a.name > b.name ? 1 : -1;
    }
    children.sort(sortName);

    var length = children ? children.length : "";
    Trace.sysout("DomProvider.getChildren; result: " + length, {
      properties: properties,
      children: children
    });

    return children;
  },

  hasChildren: function(object) {
    if (object instanceof Property) {
      var value = this.getValue(object);
      if (!value) {
        return false;
      }

      var hasChildren = value.ownPropertyLength > 0;

      // xxxHonza: Support for Fx40 (grip.ownPropertyLength doesn't exist)
      if (value.preview) {
        hasChildren = hasChildren || value.preview.ownPropertiesLength > 0;
      }

      // xxxHonza: Support (rather a workaround) for Fx39
      // (grip.preview.ownPropertiesLength doesn't exist)
      if (value.preview) {
        var preview = value.preview;
        var kind = preview.kind;
        var objectsWithProps = ["DOMNode", "ObjectWithURL"];
        hasChildren = hasChildren || (objectsWithProps.indexOf(kind) != -1);
        hasChildren = hasChildren || (kind == "ArrayLike" && preview.length > 0);
      }

      return (value.type == "object" && hasChildren);
    }
  },

  getValue: function(object) {
    if (object instanceof Property) {
      var value = object.value;
      return (typeof value.value != "undefined") ? value.value :
        value.getterValue;
    }

    return object;
  },

  getLabel: function(object) {
    if (object instanceof Property) {
      return object.name;
    }

    return object;
  },

  // ID Provider. Used e.g. for tree persistence (list of expanded nodes).
  getId: function(object) {
  },
};

function Property(name, value) {
  this.name = name;
  this.value = value;
}

// Exports from this module
exports.DomProvider = DomProvider;
});
