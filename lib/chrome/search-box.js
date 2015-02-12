/* See license.txt for terms of usage */

"use strict";

const { Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");
const { Win } = require("../core/window.js");
const { Locale } = require("../core/locale.js");
const { setTimeout, clearTimeout } = require("sdk/timers");
const { Events } = require("../core/events.js");

// XUL Builder
const { TEXTBOX, SPLITTER, BOX, TOOLBARBUTTON, PANEL, VBOX,
  LABEL, DESCRIPTION } = Xul;

const SEARCH_DELAY = 200;
const KeyEvent = Ci.nsIDOMKeyEvent;

/**
 * This object represents a search box located at the right side of
 * the main {@Toolbox} toolbar. The search box is used for searching
 * within the current panel.
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

    this.chrome = options.chrome;

    this.onChange = this.onChange.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);

    this.onPanelSelected = this.onPanelSelected.bind(this);
    this.chrome.on("panel-selected", this.onPanelSelected);
  },

  destroy: function() {
    this.chrome.off("panel-selected", this.onPanelSelected);
  },

  // Theme API

  onApplyTheme: function(win, oldTheme) {
    Trace.sysout("searchBox.onApplyTheme;");

    Win.loaded(win).then(doc => {
      if (doc.getElementById("fbSearchBox")) {
        return;
      }

      let parentNode = doc.querySelector(".devtools-tabbar");
      let separator = doc.querySelector("#toolbox-controls-separator");

      // Define search box structure.
      let searchBox = BOX({"id": "fbSearchBox", "flex": "1",
        "type": "fbSearchBox"},
        TEXTBOX({"flex": "1", "width": "0", "rows": "1", "timeout": "50",
          /*"type": "search",*/ "class": "fbsearch-textbox",
          "label": Locale.$STR("search.label")},
          BOX({"class": "fbsearch-icon"})
        ),
        /*TOOLBARBUTTON({"id": "searchPrev",
          "class": "fbsearch-options-buttons prev a11yFocus",
          "tooltiptext": Locale.$STR("search.tip.previous"),
          "role": "menuitem"}),
        TOOLBARBUTTON({"id": "searchNext",
          "class": "fbsearch-options-buttons next a11yFocus",
          "tooltiptext": Locale.$STR("search.tip.next"),
          "role": "menuitem"}),*/
        DESCRIPTION({"id": "fbSearchBoxDescription",
          "fb-collapsed": "true"}
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

      let inputBox = this.getInputBox();
      inputBox.addEventListener("command", this.onChange, false);
      inputBox.addEventListener("input", this.onChange, false);
      inputBox.addEventListener("keypress", this.onKeyPress, false);

    }).then(null, TraceError.sysout);
  },

  onUnapplyTheme: function(win, newTheme) {
    Trace.sysout("searchBox.onUnapplyTheme;");

    Win.loaded(win).then(doc => {
      if (this.box) {
        this.box.remove();
        this.splitter.remove();
        this.box = null;
        this.splitter = null;
      }
    })
  },

  getValue: function() {
    let inputBox = this.getInputBox();
    if (inputBox) {
      return inputBox.value;
    }
  },

  setValue: function(value) {
    let inputBox = this.getInputBox();
    if (inputBox) {
      inputBox.value = value;
    }
  },

  getInputBox: function() {
    return this.box ? this.box.querySelector(".fbsearch-textbox") : null;
  },

  // Events

  onKeyPress: function(event) {
    if (event.keyCode == KeyEvent.DOM_VK_UP) {
      // TODO: support for history cycle and search prev
    }
    else if (event.keyCode == KeyEvent.DOM_VK_DOWN) {
      // TODO: support for history cycle and search next
    }
    else if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
      this.setValue("");
    }
    else if (event.keyCode == KeyEvent.DOM_VK_RETURN) {
      if (Events.isShift(event))
        this.searchPrev();
      else
        this.searchNext();
    }
  },

  onChange: function(event) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(this.search.bind(this), SEARCH_DELAY);
  },

  search: function() {
    let value = this.getValue();
    this.chrome.selectedPanel.onSearch(value);
  },

  searchPrev: function() {
    // TODO: support for search prev
  },

  searchNext: function() {
    this.search();
  },

  focus: function() {
    let inputBox = this.getInputBox();
    if (inputBox) {
      inputBox.focus();
    }
  },

  // Chrome Events

  onPanelSelected: function(panel) {
    // Update visibility of the search box according to the search-ability
    // of the current panel.
    if (this.box && panel) {
      this.box.setAttribute("fb-collapsed", !panel.searchable);
    }

    // Another panel has been selected, so make sure to remove the
    // red-border that is displayed when there are no search results.
    if (this.box) {
      let textBox = this.box.querySelector(".fbsearch-textbox");
      textBox.classList.remove("devtools-no-search-result");
    }
  }
});

// Exports
exports.SearchBox = SearchBox;
