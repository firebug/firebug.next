/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { ObjectBox } = require("reps/object-box");

/**
 * @template TODO docs
 */
const String = React.createClass({
  displayName: "String",
  render: function() {
    var text = this.props.object;
    if (this.props.mode == "short") {
      return (
        ObjectBox({className: "string"},
          "\"" + cropMultipleLines(text) + "\""
        )
      )
    } else {
      return (
        ObjectBox({className: "string"},
          "\"" + cropMultipleLines(text) + "\""
        )
      )
    }
  },
});

// Helpers

function escapeNewLines(value) {
  return value.replace(/\r/gm, "\\r").replace(/\n/gm, "\\n");
};

function cropMultipleLines(text, limit) {
  return escapeNewLines(cropString(text, limit));
};

function cropString(text, limit, alternativeText) {
  if (!alternativeText) {
    alternativeText = "...";
  }

  // Make sure it's a string.
  text = text + "";

  // Use default limit if necessary.
  if (!limit) {
    limit = 50;//Options.get("stringCropLength"); xxxHonza
  }

  // Crop the string only if a limit is actually specified.
  if (limit <= 0) {
    return text;
  }

  // Set the limit at least to the length of the alternative text
  // plus one character of the original text.
  if (limit <= alternativeText.length) {
    limit = alternativeText.length + 1;
  }

  var halfLimit = (limit - alternativeText.length) / 2;

  if (text.length > limit) {
    return text.substr(0, Math.ceil(halfLimit)) + alternativeText +
      text.substr(text.length - Math.floor(halfLimit));
  }

  return text;
};

// Registration

function supportsObject(object, type) {
  return (type == "string");
}

Reps.registerRep({
  rep: React.createFactory(String),
  supportsObject: supportsObject
});

exports.String = React.createFactory(String);
});
