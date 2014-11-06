/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { getElementData } = require("../core/domplate.js");

// List of all registered reps.
var reps = [];
var defaultRep;

/**
 * This object represents central register of all rep templates.
 * These templates are used when an object should be rendered
 * anywhere in the Firebug UI. Every object should always be
 * rendered the same way.
 *
 * xxxHonza: TODO:
 * 1) Better name for the rep register
 * 2) Reps should not use the register as a namespace
 * 3) Using common reps in other modules should be done as:
 *    const { Reps } = require("./common.js");
 *    // and later...
 *    Reps.String.tag
 */
var Reps =
/** @lends Reps */
{
  extends: Reps,

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
   */
  getRep: function(object) {
    let type = typeof(object);
    if (type == "object" && object instanceof String) {
      type = "string";
    }

    if (this.isGrip(object)) {
      type = object.class;
    }

    for (var i=0; i<reps.length; i++) {
      let rep = reps[i];
      try {
        // xxxHonza: supportsObject should return weight (not only true/false
        // but a number), which would allow to priorities templates and
        // support better extensibility.
        if (rep.supportsObject(object, type)) {

          // xxxHonza: blocked by issue #1
          /*Trace.sysout("reps.getRep; rep found " + rep.className, {
            object: object,
            rep: rep
          });*/

          return rep;
        }
      }
      catch (err) {
        TraceError.sysout("reps.getRep; EXCEPTION " + err, err);
      }
    }

    //return (type == "function") ? defaultFuncRep : defaultRep;
    return defaultRep || Reps.Obj;
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
    return getElementData(node, "repObject");
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
      let data = this.getRepObject(child);
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
};

// Exports from this module
exports.Reps = Reps;
