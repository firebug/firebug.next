/* See license.txt for terms of usage */

"use strict";

// ********************************************************************************************* //
// Constants

const { Trace } = require("./trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// ********************************************************************************************* //
// Search Box

const SearchBox = Class({
  extends: EventTarget,
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    var doc = options.parentNode.ownerDocument;
    var box = doc.createElementNS(XUL_NS, "textbox");
    box.setAttribute("id", "fbSearchBox");
    box.setAttribute("flex", "70");
    box.setAttribute("type", "fbSearchBox");

    options.parentNode.insertBefore(box, options.reference);

    var doc = options.parentNode.ownerDocument;
    var splitter = doc.createElementNS(XUL_NS, "splitter");
    splitter.setAttribute("resizebefore", "flex");
    splitter.setAttribute("resizeafter", "flex");
    splitter.setAttribute("class", "fbsearch-splitter");

    options.parentNode.insertBefore(splitter, box);

    Trace.sysout("searchBox.initialize;", arguments);
  },
});

// ********************************************************************************************* //
// Registration

exports.SearchBox = SearchBox;

// ********************************************************************************************* //
