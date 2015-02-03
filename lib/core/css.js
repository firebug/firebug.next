/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { setTimeout, clearTimeout } = require("sdk/timers");

// Module Implementation
var Css = {};

// xxxHonza: needs refactoring, avoid expandos
Css.setClassTimed = function(elt, name, timeout = 1300) {
  if (elt.__setClassTimeout) {
    // then we are already waiting to remove the class mark
    context.clearTimeout(elt.__setClassTimeout);
  } else {
    // then we are not waiting to remove the mark
    elt.classList.add(name);
  }

  // xxxHonza: FIXME
  if (false/*!Xml.isVisible(elt)*/) {
    if (elt.__invisibleAtSetPoint) {
      elt.__invisibleAtSetPoint--;
    } else {
      elt.__invisibleAtSetPoint = 5;
    }
  }
  else {
    delete elt.__invisibleAtSetPoint;
  }

  elt.__setClassTimeout = setTimeout(function() {
    delete elt.__setClassTimeout;

    if (elt.__invisibleAtSetPoint) {
      // then user can't see it, try again later
      Css.setClassTimed(elt, name, context, timeout);
    } else {
      // may be zero
      delete elt.__invisibleAtSetPoint;
      elt.classList.remove(name);
    }
  }, timeout);
};

Css.cancelClassTimed = function(elt, name) {
  if (elt.__setClassTimeout) {
    elt.classList.remove(name);
    clearTimeout(elt.__setClassTimeout);
    delete elt.__setClassTimeout;
  }
};

// xxxHonza: deprecated
Css.toggleClass = function(element, name) {
  element.classList.toggle(name);
}

Css.hasClass = function(element, name) {
  element.classList.contains(name);
}

Css.setClass = function(element, name) {
  element.classList.add(name);
}

Css.removeClass = function(element, name) {
  element.classList.remove(name);
}
// Exports from this module
exports.Css = Css;
