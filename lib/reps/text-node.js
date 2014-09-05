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
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var TextNode = domplate(Rep,
/** @lends TextNode */
{
  className: "textNode",

  tag:
    OBJECTLINK(
      "&lt;",
      SPAN({"class": "nodeTag"}, "TextNode"),
      " textContent=&quot;",
      SPAN({"class": "nodeValue"}, "$object|getTextContent"),
      "&quot;",
      "&gt;"
    ),

  getTextContent: function(grip) {
    return this.cropMultipleLines(grip.preview.textContent);
  },

  inspectObject: function(node, chrome) {
    //chrome.select(node, "html", "domSide");
  },

  supportsObject: function(grip, type) {
    if (!Reps.isGrip(grip))
      return false;

    return (grip.preview && grip.class == "Text");
  },

  getTitle: function(win, context) {
    return "textNode";
  }
});

// Registration
Reps.registerRep(TextNode);

// Exports from this module
exports.TextNode = TextNode;
