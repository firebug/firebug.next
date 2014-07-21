/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

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
var ObjectWithUrl = domplate(Rep,
/** @lends ObjectWithUrl */
{
  className: "object",

  tag:
    OBJECTLINK(
      SPAN({"class": "objectTitle"}, "$object|getTitle "),
      SPAN({"class": "objectPropValue"},
        "$object|getLocation"
      )
    ),

  getTitle: function(grip) {
    return grip.class;
  },

  getLocation: function(grip) {
    let url = grip.preview.url;
    return url ? Url.getFileName(url) : "";
  },

  supportsObject: function(grip, type) {
    if (!Reps.isGrip(grip))
      return false;

    return (grip.preview && grip.preview.kind == "ObjectWithURL");
  },

  openInTab: function(grip) {
    Win.openNewTab(grip.preview.url);
  },

  browseObject: function(grip, context) {
    Win.openNewTab(grip.preview.url);
    return true;
  },

  getTooltip: function(grip) {
    return grip.preview.url;
  },

  copyURL: function(grip) {
    System.copyToClipboard(grip.preview.url);
  },

  getContextMenuItems: function(styleSheet, target, context) {
    return [
      {
        label: "CopyLocation",
        tooltiptext: "clipboard.tip.Copy_Location",
        command: this.copyURL.bind(this, styleSheet)
      },
      "-",
      {
        label: "OpenInTab",
        tooltiptext: "firebug.tip.Open_In_Tab",
        command: this.openInTab.bind(this, styleSheet)
      }
    ];
  },
});

// Registration
Reps.registerRep(ObjectWithUrl);

// Exports from this module
exports.ObjectWithUrl = ObjectWithUrl;
