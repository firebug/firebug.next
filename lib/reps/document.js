/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { Url } = require("../core/url.js");

// Domplate
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var Document = domplate(Rep,
/** @lends Document */
{
  className: "object",

  tag:
    OBJECTLINK("Document ",
      SPAN({"class": "objectPropValue"},
        "$object|getLocation"
      )
    ),

  getLocation: function(grip) {
    let location = grip.preview.location;
    return location ? Url.getFileName(location) : "";
  },

  supportsObject: function(object, type) {
    return (type == "HTMLDocument");
  },

  browseObject: function(doc, context) {
    //xxxHonza: FIX ME Win.openNewTab(doc.location.href);
    return true;
  },

  persistObject: function(doc, context) {
    return this.persistor;
  },

  persistor: function(context) {
    return context.window.document;
  },

  getTitle: function(win, context) {
    return "document";
  },

  getTooltip: function(doc) {
    return doc.location.href;
  }
});

// Registration
Reps.registerRep(Document);

// Exports from this module
exports.Document = Document;
