/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");

// XUL Builder
const { TEXTBOX, SPLITTER } = Xul;

// The only instance of the SearchBox.
let searchBox;

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

    // Build search box.
    this.box = box.build(options.parentNode, {
      insertBefore: options.reference
    });

    // Build toolbar splitter.
    this.splitter = splitter.build(options.parentNode, {
      insertBefore: this.box
    });
  },

  destroy: function() {
    this.box.remove();
    this.splitter.remove();
  }
});

// Apply/unapply Search Box theme
function customizeSearchBox(toolbox, apply) {
  if (apply) {
    if (searchBox)
      return;

    let doc = toolbox.doc;
    let tabBar = doc.querySelector(".devtools-tabbar");

    searchBox = new SearchBox({
      parentNode: tabBar,
      reference: doc.querySelector("#toolbox-controls-separator")
    });
  }
  else {
    if (searchBox) {
      searchBox.destroy();
      searchBox = null;
    }
  }
}

// Exports
exports.customizeSearchBox = customizeSearchBox;
