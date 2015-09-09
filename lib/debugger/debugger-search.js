/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Class } = require("sdk/core/heritage");

/**
 * Helper object that hooks the original debugger search field and
 * connects it into the shared main search box UI.
 * xxxHonza: this should be refactored as soon as proper search UI
 * is built in.
 */
var DebuggerSearch = Class(
/** @lends DebuggerSearch */
{
  initialize: function(options) {
    Trace.sysout("debuggerSearch.initialize;", options);

    this.overlay = options.overlay;
    this.Filtering = this.overlay.panel._view.Filtering;
    this.FilteredSources = this.Filtering.FilteredSources ||
      this.overlay.panel._view.FilteredSources;

    this.chrome = this.overlay.chrome;

    this._onInput = this._onInput.bind(this);
    this._onClick = this._onClick.bind(this);

    let doc = this.overlay.getPanelDocument();
    this._searchboxHelpPanel = doc.getElementById("searchbox-help-panel");

    this._searchbox = this.chrome.searchBox.getInputBox();
    this._searchbox.addEventListener("click", this._onClick, false);
    this._searchbox.addEventListener("select", this._onInput, false);
    this._searchbox.addEventListener("input", this._onInput, false);
    this._searchbox.addEventListener("keypress", this.Filtering._onKeyPress, false);
    this._searchbox.addEventListener("blur", this.Filtering._onBlur, false);

    this.Filtering._searchbox = this._searchbox;
    this.FilteredSources.anchor = this._searchbox;

    this.Filtering._searchbox = this._searchbox;
    this.FilteredSources.anchor = this._searchbox;
  },

  destroy: function() {
    Trace.sysout("debuggerSearch.destroy;");

    this._searchbox.removeEventListener("click", this._onClick, false);
    this._searchbox.removeEventListener("select", this._onInput, false);
    this._searchbox.removeEventListener("input", this._onInput, false);
    this._searchbox.removeEventListener("keypress", this.Filtering._onKeyPress, false);
    this._searchbox.removeEventListener("blur", this.Filtering._onBlur, false);

    let doc = this.overlay.getPanelDocument();
    if (!doc) {
      return;
    }

    let searchBox = doc.getElementById("searchbox");
    this.Filtering._searchbox = searchBox;
    this.FilteredSources.anchor = searchBox;
  },

  _onInput: function() {
    let doc = this.overlay.getPanelDocument();
    let originalSearchBox = doc.getElementById("searchbox");

    originalSearchBox.value = this._searchbox.value;

    this.Filtering._onInput();
  },

  _onClick: function() {
    if (!this._searchbox.value) {
      this._searchboxHelpPanel.openPopup(this._searchbox, "after_start", 16);
    }
  },
});

// Exports from this module
exports.DebuggerSearch = DebuggerSearch;
