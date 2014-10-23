/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");
const { Win } = require("../core/window.js");
const { Locale } = require("../core/locale.js");

// XUL Builder
const { TEXTBOX, SPLITTER, BOX, TOOLBARBUTTON, PANEL, VBOX,
  LABEL, DESCRIPTION } = Xul;

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

      // Define search box structure.
      let searchBox = BOX({"id": "fbSearchBox", "flex": "70",
        "type": "fbSearchBox"},
        TEXTBOX({"flex": "1", "width": "0", "rows": "1",
          "class": "fbsearch-textbox", "label": Locale.$STR("search.label")},
          BOX({"class": "fbsearch-icon"})
        ),
        TOOLBARBUTTON({"id": "searchPrev",
            "class": "fbsearch-options-buttons prev a11yFocus",
            "tooltiptext": Locale.$STR("search.tip.previous"),
            "role": "menuitem"}),
        TOOLBARBUTTON({"id": "searchNext",
            "class": "fbsearch-options-buttons next a11yFocus",
            "tooltiptext": Locale.$STR("search.tip.next"),
            "role": "menuitem"}),
        DESCRIPTION({"id": "fbSearchBoxDescription",
          "collapsed": "true"}
        ),
        PANEL({"id": "fbSearchOptionsPanel", "norestorefocus": "true",
            "noautofocus": "true", "ignorekeys": "true",
            "role": "presentation", "type": "arrow"},
          VBOX(
            LABEL({"id": "fbSearchBoxIsSensitive",
              "value": Locale.$STR("search.caseAutoSensitive")}
            ),
            LABEL({"id": "fbSearchBoxIsNotSensitive",
              "value": Locale.$STR("search.caseInsensitive")}
            ),
            VBOX({"class": "searchOptionsMenu innerToolbar", "role": "menu",
              "id": "fbSearchOptionsMenu"},
                 VBOX({"id": "searchOptionsList", "role": "presentation"})
            )
          )
        )
      );

      // Build search box DOM
      this.box = searchBox.build(parentNode, {
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
      if (this.box) {
        this.box.remove();
        this.splitter.remove();
      }
    })
  },
});

// Exports
exports.SearchBox = SearchBox;
