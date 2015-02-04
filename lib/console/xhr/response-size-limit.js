/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

// Domplate
const { Domplate } = require("../../core/domplate.js");
const { domplate, DIV, SPAN, A } = Domplate;
const { Rep } = require("../../reps/rep.js");

/**
 * @domplate TODO: docs
 */
var ResponseSizeLimit = domplate(Rep, {
  tag:
    DIV({"class": "netInfoResponseSizeLimit"},
      SPAN("$object.beforeLink"),
      A({"class": "objectLink", onclick: "$onClickLink"},
        "$object.linkText"
      ),
      SPAN("$object.afterLink")
    ),

  reLink: /^(.*)<a>(.*)<\/a>(.*$)/,

  append: function(obj, parent) {
    var m = obj.text.match(this.reLink);
    return this.tag.append({onClickLink: obj.onClickLink,
      object: {
      beforeLink: m[1],
      linkText: m[2],
      afterLink: m[3],
    }}, parent, this);
  }
});

// Exports from this module
exports.ResponseSizeLimit = ResponseSizeLimit;
