/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");

// List of all registered reps.
var reps = [];
var defaultRep;

/**
 * TODO docs
 */
var Reps =
/** @lends Reps */
{
  initialize: function(toolbox) {
    // TODO: initialization steps
  },

  /**
   * Return a rep object that is responsible for rendering given
   * object.
   *
   * @param object {Object} Object to be rendered in the UI. This
   * can be generic JS object as well as a grip (handle to a remote
   * debuggee object).
   *
   * xxxHonza: should be renamed to getTag (it doesn't return the rep
   * object itself, but underlying template).
   */
  getRep: function(object) {
    var type = typeof(object);
    if (type == "object" && object instanceof String) {
      type = "string";
    }

    if (this.isGrip(object)) {
      type = object.class;
    }

    for (var i=0; i<reps.length; i++) {
      var rep = reps[i];
      try {
        // xxxHonza: supportsObject should return weight (not only true/false
        // but a number), which would allow to priorities templates and
        // support better extensibility.
        if (rep.supportsObject(object, type)) {
          return rep.rep;
        }
      }
      catch (err) {
        Trace.sysout("reps.getRep; EXCEPTION " + err, err);
      }
    }

    //return (type == "function") ? defaultFuncRep : defaultRep;
    return defaultRep.rep;
  },

  registerRep: function() {
    reps.push.apply(reps, arguments);
  },

  registerDefaultRep: function(rep) {
    defaultRep = rep;
  },

  isGrip: function(object) {
    // xxxHonza: we need to use instanceof Grip
    return object && object.actor;
  },

  /**
   * Returns the object (repObject) associated with a particular node, or
   * 'undefined' if there is none.
   */
  getRepObject: function(node) {
    return node.repObject;
  },

  /**
   * Returns an object (aka repObject) associated with the clicked {@Rep} UI,
   * traversing the parent chain until one is found. If there is none, returns
   * 'undefined'.
   *
   * @param {@Element} Clicked DOM target.
   */
  getTargetRepObject: function(node) {
    for (var child = node; child; child = child.parentNode) {
      var data = this.getRepObject(child);
      if (data != null) {
        if (child.classList.contains("repIgnore")) {
          return undefined;
        } else {
          return data;
        }
      }
    }
    return undefined;
  },

  /**
   * Returns the parent node that has a repObject.
   */
  getRepNode: function(node) {
    for (var child = node; child; child = child.parentNode) {
      if (this.getRepObject(child) != null) {
        return child;
      }
    }
  },

  /**
   * TODO: docs
   */
  get DOM() {
    if (this.reactDom) {
      return this.reactDom;
    }

    this.reactDom = {};

    var factory = function(prop) {
      return () => {
        return React.DOM[prop].apply(React.DOM, arguments);
      }
    }

    var props = Object.getOwnPropertyNames(React.DOM);
    for (var i=0; i<props.length; i++) {
      var prop = String.toUpperCase(props[i]);
      this.reactDom[prop] = factory(props[i]);
    }

    return this.reactDom;
  }
};

// Exports from this module
exports.Reps = Reps;
});
