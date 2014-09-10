/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");
const { Win } = require("../core/window.js");

// XUL Builder
const { TEXTBOX, SPLITTER } = Xul;

/**
 * This object represents a search box located at the right side of
 * the main {@Toolbox} toolbar. The search box should be used for
 * searching in the current panel.
 *
 * xxxHonza: this is one of the Firebug gaps and should be available
 * natively in the Toolbox.
 */
const SearchBox = Class(
/** @lends SearchBox */
{
  extends: EventTarget,

  // Initialization

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("searchBox.initialize;", options);
  },

  destroy: function() {
  },

  // Theme API

  onApplyTheme: function(win, oldTheme) {
    Win.loaded(win).then(doc => {
      if (doc.getElementById("fbSearchBox"))
        return;

      let parentNode = doc.querySelector(".devtools-tabbar");
      let separator = doc.querySelector("#toolbox-controls-separator");

      // Build search box
      this.box = TEXTBOX({
        "id": "fbSearchBox",
        "flex": "70",
        "type": "fbSearchBox"
      }).build(parentNode, {
        insertBefore: separator
      });

      // Build splitter
      this.splitter = SPLITTER({
        "class": "fbsearch-splitter",
        "resizebefore": "flex",
        "resizeafter": "flex"
      }).build(parentNode, {
        insertBefore: this.box
      });

    }).then(null, TraceError.sysout);
  },

  onUnapplyTheme: function(win, newTheme) {
    Win.loaded(win).then(doc => {
      this.box.remove();
      this.splitter.remove();
    })
  },
});

// Exports
exports.SearchBox = SearchBox;
