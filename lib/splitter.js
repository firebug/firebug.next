/* See license.txt for terms of usage */

"use strict";

const { Trace } = require("./core/trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const Splitter = Class({
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
