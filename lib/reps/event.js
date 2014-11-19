/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");

// Domplate
const { domplate } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var Event = domplate(Rep,
/** @lends Event */
{
  className: "event",

  tag:
    OBJECTLINK("$object|summarizeEvent"),

  summarizeEvent: function(grip) {
    let info = [grip.preview.type, " "];

    let eventFamily = grip.class;
    let props = grip.preview.properties;

    if (eventFamily == "MouseEvent") {
      info.push("clientX=", props.clientX, ", clientY=", props.clientY);
    } else if (eventFamily == "KeyboardEvent") {
      info.push("charCode=", props.charCode, ", keyCode=", props.keyCode);
    } else if (eventFamily == "MessageEvent") {
      info.push("origin=", props.origin, ", data=", props.data);
    }

    return info.join("");
  },

  supportsObject: function(grip, type) {
    return (grip.preview && grip.preview.kind == "DOMEvent");
  },
});

// Registration
Reps.registerRep(Event);

// Exports from this module
exports.Event = Event;
