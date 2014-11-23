/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { BaseSidePanel } = require("../chrome/baseSidePanel");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Dom } = require("../core/dom.js");

/**
 * @panel This object represents 'Media' side panel within the
 * Style Editor panel. The panel displayed list of media-rules
 * used in the current debugging target (page).
 */
const MediaPanel = Class(
/** @lends MediaPanel */
{
  extends: BaseSidePanel,

  // xxxHonza: localization
  id: "MediaPanel",
  label: "Media Rules",
  tooltip: "Displays media rules in the current stylesheet",
  icon: "./icon-16.png",
  url: "./media-panel.html",

  setup: function(options) {
    BaseSidePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("mediaPanel.setup;", options);

    this.UI = this.owner.panel.UI;

    this.onEditorSelected = this.onEditorSelected.bind(this);

    // Register {@StyleEditorUI} listeners
    this.UI.on("editor-selected", this.onEditorSelected);

    // Listen for "media-list-changed", it's fired when a media
    // side bar is populated.
    // xxxHonza: remove the listener.
    this.UI.on("media-list-changed", (event, editor) => {
      this.UI.getEditorDetails(editor).then((details) => {
        this.onMediaListChanged(editor, details);
      });
    });
  },

  destroy: function() {
    BaseSidePanel.prototype.destroy.apply(this, arguments);

    Trace.sysout("mediaPanel.destroy;");

    this.UI.off("editor-selected", this.onEditorSelected);
  },

  onReady: function(options) {
    BaseSidePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("mediaPanel.onReady;");

    let win = this.getPanelWindow();
    loadSheet(win, "chrome://firebug/skin/media-rules.css", "author");
    loadSheet(win, "chrome://firebug/skin/firebug-theme.css", "author");
  },

  // StyleEditorUI Events
 
  onEditorSelected: function(event, editor) {
    Trace.sysout("mediaPanel.onEditorSelected; ", editor);

    this.UI.getEditorDetails(editor).then((details) => {
      this.onMediaListChanged(editor, details);
    });
  },

  onMediaListChanged: function(editor, details) {
    Trace.sysout("mediaPanel.onMediaListChanged;", editor);

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
