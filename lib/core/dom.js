/* See license.txt for terms of usage */

"use strict";

// Module implementation
var Dom = {};

Dom.clearNode = function(node) {
  node.textContent = "";
};

Dom.getAncestorByClass = function(node, className) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.classList && parent.classList.contains(className))
      return parent;
  }
  return null;
};

Dom.getAncestorByTagName = function(node, tagName) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.localName && parent.tagName.toLowerCase() == tagName)
      return parent;
  }
  return null;
};

// Exports from this module
exports.Dom = Dom;
