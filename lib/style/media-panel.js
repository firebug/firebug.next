/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { Dom } = require("firebug.sdk/lib/core/dom.js");

const { BaseSidePanel } = require("../chrome/base-side-panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");

/**
 * @panel This object represents 'Media' side panel within the
 * Style Editor panel. The panel displayed list of media-rules
 * used in the current debugging target (page).
 */
const MediaPanel = Class(
/** @lends MediaPanel */
{
  extends: BaseSidePanel,

  id: "MediaPanel",
  label: Locale.$STR("style.mediaRules.title"),
  tooltip: Locale.$STR("style.mediaRules.tip"),
  icon: "./icon-16.png",
  url: "./style-editor/media-panel.html",

  setup: function(options) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("mediaPanel.setup;", options);

    this.onEditorSelected = this.onEditorSelected.bind(this);
    this.onMediaListChanged = this.onMediaListChanged.bind(this);
  },

  destroy: function() {
    BaseSidePanel.prototype.destroy.apply(this, arguments);

    Trace.sysout("mediaPanel.destroy;");

    if (!this.UI) {
      return;
    }

    this.UI.off("editor-selected", this.onEditorSelected);
    this.UI.off("media-list-changed", this.onMediaListChanged);
  },

  onReady: function(options) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("mediaPanel.onReady; ", options);

    this.UI = this.owner.panel.UI;

    // Register {@StyleEditorUI} listeners
    this.UI.on("editor-selected", this.onEditorSelected);
    this.UI.on("media-list-changed", this.onMediaListChanged);

    let win = this.getPanelWindow();
    loadSheet(win, "chrome://firebug/skin/media-rules.css", "author");
    loadSheet(win, "chrome://firebug/skin/firebug-theme.css", "author");

    // Initialize the side bar, so it shows media for the
    // currently selected editor.
    this.onEditorSelected({}, this.UI.selectedEditor);
  },

  // StyleEditorUI Events
 
  onEditorSelected: function(event, editor) {
    Trace.sysout("mediaPanel.onEditorSelected;", editor);

    this.UI.getEditorDetails(editor).then(details => {
      this.updateMediaList(editor, details);
    });
  },

  onMediaListChanged: function(event, editor) {
    Trace.sysout("mediaPanel.onMediaListChanged;", editor);

    this.UI.getEditorDetails(editor).then(details => {
      this.updateMediaList(editor, details);

      // Make sure that the side bar shows media for the
      // currently selected editor. Built-in tools use
      // more instances of the side bar (one per stylesheet).
      this.onEditorSelected({}, this.UI.selectedEditor);
    });
  },

  // Update Content

  updateMediaList: function(editor, details) {
    Trace.sysout("mediaPanel.updateMediaList;", editor);

    Dom.clearNode(this.panelNode);

    let rules = editor.mediaRules;
    let inSource = false;

    if (rules.length == 0) {
      let doc = this.getPanelDocument();
      let panelDescription = doc.createElement("div");
      panelDescription.className = "panel-description";
      panelDescription.textContent = "There are no media rules for this style sheet.";
      this.panelNode.appendChild(panelDescription);
    }

    for (let rule of rules) {
      let {line, column, parentStyleSheet} = rule;

      let location = {
        line: line,
        column: column,
        source: editor.styleSheet.href,
        styleSheet: parentStyleSheet
      };

      // xxxHonza: FIXME
      /*if (editor.styleSheet.isOriginalSource) {
        location = yield editor.cssSheet.getOriginalLocation(line, column);
      }*/

      // this @media rule is from a different original source
      if (location.source != editor.styleSheet.href) {
        continue;
      }

      inSource = true;

      let doc = this.getPanelDocument();
      let div = doc.createElement("div");
      div.className = "media-rule-label";

      div.addEventListener("click", this.UI._jumpToLocation.bind(
        this.UI, location));

      let cond = doc.createElement("div");
      cond.textContent = rule.conditionText;
      cond.className = "media-rule-condition"

      if (!rule.matches) {
        cond.classList.add("media-condition-unmatched");
      }

      div.appendChild(cond);

      let link = doc.createElement("div");
      link.className = "media-rule-line theme-link";

      if (location.line != -1) {
        link.textContent = ":" + location.line;
      }

      div.appendChild(link);

      this.panelNode.appendChild(div);
    }
  }
});

// Exports from this module
exports.MediaPanel = MediaPanel;
