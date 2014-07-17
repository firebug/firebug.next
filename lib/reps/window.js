/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { Str } = require("../core/string.js");

// Domplate
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var Window = domplate(Rep,
/** @lends Window */
{
  className: "object",

  tag:
    OBJECTLINK("$object|getTitle ",
      SPAN({"class": "objectPropValue"},
        "$object|getLocation"
      )
    ),

  getLocation: function(grip) {
    return Str.cropString(grip.preview.url);
  },

  supportsObject: function(grip, type) {
    return (grip.class == "Window" && grip.preview);
  },

  browseObject: function(win, context) {
    // xxxHonza FIX ME Win.openNewTab(win.location.href);
    return true;
  },

  persistObject: function(win, context) {
    return this.persistor;
  },

  persistor: function(context) {
    // xxxHonza: FIX ME return context.window;
  },

  getTitle: function(grip, context) {
    return grip.class;
  },

  getTooltip: function(grip) {
    return grip.preview.url;
  }
});

// Registration
Reps.registerRep(Window);

// Exports from this module
exports.Window = Window;
