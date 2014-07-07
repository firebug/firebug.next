/* See license.txt for terms of usage */

"use strict";

const { Css } = require("../core/css.js");

// Module implementation 
var Dom = {};

Dom.clearNode = function(node) {
  node.textContent = "";
};

Dom.getAncestorByClass = function(node, className) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (Css.hasClass(parent, className))
      return parent;
  }
  return null;
};

// Exports from this module
exports.Dom = Dom;
