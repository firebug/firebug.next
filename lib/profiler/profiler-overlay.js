/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { BaseOverlay } = require("../chrome/base-overlay.js");
const { Win } = require("../core/window.js");
const { Xul } = require("../core/xul.js");

const { ARROWSCROLLBOX } = Xul;

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the 'Profiler' panel.
 */
const ProfilerOverlay = Class(
/** @lends ProfilerOverlay */
{
  extends: BaseOverlay,

  overlayId: "jsprofiler",

  // Initialization
  initialize: function(options) {
    BaseOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("profilerOverlay.initialize;", options);
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("profilerOverlay.onReady;", options);

    this.onNewTab = this.onNewTab.bind(this);
    this.rebuildTreeFromSelection = this.rebuildTreeFromSelection.bind(this);

    let win = this.getPanelWindow();
    win.on("Profiler:TabSpawnedFromSelection", this.onNewTab, false);

    // xxxHonza: monkey patch the rebuild method to make sure the
    // 'new tab' button is visible when created.
    // TODO: ask for an event on the platform FIXME
    this._rebuildTreeFromSelection = win.ProfileView._rebuildTreeFromSelection;
    win.ProfileView._rebuildTreeFromSelection = this.rebuildTreeFromSelection;
  },

  destroy: function() {
    Trace.sysout("profilerOverlay.destroy;", arguments);

    let win = this.getPanelWindow();
    win.off("Profiler:TabSpawnedFromSelection", this.onNewTab, false);
    win.ProfileView._rebuildTreeFromSelection = this._rebuildTreeFromSelection;
  },

  onApplyTheme: function(win, oldTheme) {
    loadSheet(win, "chrome://firebug/skin/profiler.css", "author");
    loadSheet(win, "chrome://firebug/skin/panel-content.css", "author");

    Win.loaded(win).then(() => this.applyFirebugLayout(win));
  },

  onUnapplyTheme: function(win, newTheme) {
    removeSheet(win, "chrome://firebug/skin/profiler.css", "author");
    removeSheet(win, "chrome://firebug/skin/panel-content.css", "author");

    Win.loaded(win).then(() => this.unapplyFirebugLayout(win));
  },

  applyFirebugLayout: function(win) {
    let doc = win.document;

    if (this.scrollBox) {
      return;
    }

    // xxxHonza: what if the expected XUL structure changes? TESTME
    let profileContent = doc.getElementById("profile-content");
    let box = doc.querySelector("#profile-content hbox");
    let tabPanels = doc.querySelector("#profile-content tabpanels");

    this.scrollBox = ARROWSCROLLBOX({
      orient: "horizontal",
    }).build(profileContent, {insertBefore: tabPanels});

    box.setAttribute("flex", "1");
    this.scrollBox.appendChild(box);
},

  unapplyFirebugLayout: function(win) {
    let doc = win.document;

    if (!this.scrollBox) {
      return;
    }

    let profileContent = doc.getElementById("profile-content");
    let box = doc.querySelector("#profile-content hbox");
    let tabPanels = doc.querySelector("#profile-content tabpanels");

    profileContent.insertBefore(box, tabPanels);

    this.scrollBox.remove();
    this.scrollBox = null;
  },

  onNewTab: function(eventId) {
    if (this.scrollBox) {
      let doc = this.getPanelDocument();
      let tab = doc.querySelector("#profile-content tab:last-child");
      this.scrollBox.ensureElementIsVisible(tab);
    }
  },

  rebuildTreeFromSelection: function() {
    let win = this.getPanelWindow();

    this._rebuildTreeFromSelection.apply(win.ProfileView, arguments);

    // Make sure the 'new tab' button is visible.
    if (this.scrollBox) {
      let doc = this.getPanelDocument();
      let button = doc.getElementById("profile-newtab-button");
      this.scrollBox.ensureElementIsVisible(button);
    }
  }
});

// Exports from this module
exports.ProfilerOverlay = ProfilerOverlay;
