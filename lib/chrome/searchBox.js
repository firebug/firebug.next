/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * This object represents SearchBox located on the right side of
 * the main Toolbox toolbar.
 */
const SearchBox = Class(
/** @lends SearchBox */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    let doc = options.parentNode.ownerDocument;
    let box = doc.createElementNS(XUL_NS, "textbox");
    box.setAttribute("id", "fbSearchBox");
    box.setAttribute("flex", "70");
    box.setAttribute("type", "fbSearchBox");

    options.parentNode.insertBefore(box, options.reference);

    let doc = options.parentNode.ownerDocument;
    let splitter = doc.createElementNS(XUL_NS, "splitter");
    splitter.setAttribute("resizebefore", "flex");
    splitter.setAttribute("resizeafter", "flex");
    splitter.setAttribute("class", "fbsearch-splitter");

    options.parentNode.insertBefore(splitter, box);

    Trace.sysout("searchBox.initialize;", arguments);
  },
});

// Exports
exports.SearchBox = SearchBox;
