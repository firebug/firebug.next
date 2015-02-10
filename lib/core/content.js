/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

var Content = {};

/**
 * TODO: docs
 */
Content.exportIntoContentScope = function(win, obj, defineAs) {
  var clone = Cu.createObjectIn(win, {
    defineAs: defineAs
  });

  var props = Object.getOwnPropertyNames(obj);
  for (var i=0; i<props.length; i++) {
    var propName = props[i];
    var propValue = obj[propName];
    if (typeof propValue == "function") {
      Cu.exportFunction(propValue, clone, {
        defineAs: propName
      });
    }
  }
}

// Exports from this module
exports.Content = Content;
