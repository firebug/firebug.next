/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");

// XUL Builder
const { TEXTBOX, SPLITTER } = Xul;

/**
 * This object represents SearchBox located at the right side of
 * the main {@Toolbox} toolbar.
 */
const SearchBox = Class(
/** @lends SearchBox */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("searchBox.initialize;", options);

    let box = TEXTBOX({
      "id": "fbSearchBox",
      "flex": "70",
      "type": "fbSearchBox"
    });

    let splitter = SPLITTER({
      "class": "fbsearch-splitter",
      "resizebefore": "flex",
      "resizeafter": "flex"
    });

    // Build search box XUL structure
    box = box.build(options.parentNode, {insertBefore: options.reference});
    splitter.build(options.parentNode, {insertBefore: box});
  },
});

// Exports
exports.SearchBox = SearchBox;
