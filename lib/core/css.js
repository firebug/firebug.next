/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js");
const { Cu, Ci } = require("chrome");

// Module Implementation
var Css = {};

var classNameReCache = {};

Css.hasClass = function(node, name)
{
  if (!node || node.nodeType != Ci.nsIDOMNode.ELEMENT_NODE ||
      !node.className || typeof(node.className) != "string" || !name) {
    return false;
  }

  if (name.indexOf(" ") != -1) {
    var classes = name.split(" ");
    var len = classes.length;
    var found = false;

    for (var i = 0; i < len; i++) {
      var cls = classes[i].trim();
      if (cls != "") {
        if (Css.hasClass(node, cls) == false)
          return false;
        found = true;
      }
    }

    return found;
  }

  var re;
  if (name.indexOf("-") == -1) {
    re = classNameReCache[name] = classNameReCache[name] ||
    new RegExp('(^|\\s)' + name + '(\\s|$)', "g");
  }
  else {
    // XXXsroussey don't cache these, they are often setting values.
    // Should be using setUserData/getUserData???
    re = new RegExp('(^|\\s)' + name + '(\\s|$)', "g");
  }

  return node.className.search(re) != -1;
};

Css.removeClass = function(node, name)
{
  if (!node || node.nodeType != Ci.nsIDOMNode.ELEMENT_NODE ||
      node.className == '' || name == '') {
    return;
  }

  if (name.indexOf(" ") != -1) {
    var classes = name.split(" "), len = classes.length;
    for (var i = 0; i < len; i++) {
      var cls = classes[i].trim();
      if (cls != "") {
        if (Css.hasClass(node, cls) == false)
          Css.removeClass(node, cls);
      }
    }
    return;
  }

  var re;
  if (name.indexOf("-") == -1)
    re = classNameReCache[name] = classNameReCache[name] || new RegExp('(^|\\s)' + name + '(\\s|$)', "g");
  else // XXXsroussey don't cache these, they are often setting values. Should be using setUserData/getUserData???
    re = new RegExp('(^|\\s)' + name + '(\\s|$)', "g");

  node.className = node.className.replace(re, " ");
};

Css.setClass = function(node, name)
{
  if (!node || node.nodeType != Ci.nsIDOMNode.ELEMENT_NODE || name == '')
    return;

  if (name.indexOf(" ") != -1) {
    var classes = name.split(" "), len = classes.length;
    for (var i = 0; i < len; i++) {
      var cls = classes[i].trim();
      if (cls != "") {
        Css.setClass(node, cls);
      }
    }
    return;
  }

  if (!Css.hasClass(node, name))
    node.className = node.className.trim() + " " + name;
};

// Exports from this module
exports.Css = Css;
