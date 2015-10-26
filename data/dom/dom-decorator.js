/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Firebug
const { Property } = require("dom-provider");

// Implementation
function DomDecorator() {
}

/**
 * TODO: move to FBSDK
 */
DomDecorator.prototype =
/** @lends DomDecorator */
{
  getRowClassNames: function(object) {
    if (object instanceof Property) {
      var value = object.value;
      var names = [];
      if (value.enumerable) {
        names.push("enumerable");
      }
      if (value.writable) {
        names.push("writable");
      }
      if (value.configurable) {
        names.push("configurable");
      }
      return names;
    }
  },
};

// Exports from this module
exports.DomDecorator = DomDecorator;
});
