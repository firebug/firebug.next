/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * TODO: description
 */
const Splitter = Class(
/** @lends Splitter */
{
  extends: EventTarget,

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    var doc = options.parentNode.ownerDocument;
    var splitter = doc.createElementNS(XUL_NS, "splitter");
    splitter.setAttribute("id", "panelToolbarBox");

    options.parentNode.appendChild(splitter);
  },
});

exports.Splitter = Splitter;
