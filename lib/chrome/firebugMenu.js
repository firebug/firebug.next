/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { ToolbarButton } = require("./panelToolbar.js");
const { Win } = require("../core/window.js");
const { EventTarget } = require("sdk/event/target");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { Locale } = require("../core/locale.js");

Cu.import("resource://gre/modules/AddonManager.jsm");

/**
 * This object represents 'Firebug menu' that is accessible through
 * Firebug icon located on the far left side of the main toolbox toolbar.
 */
const FirebugMenu = Class(
/** @lends FirebugMenu */
{
  extends: EventTarget,

  initialize: function(options) {
  },

  // Theme API

  onApplyTheme: function(win, oldTheme) {
    Win.loaded(win).then(doc => {
      // The button can already exist. This may happen since theme-unapply
      // hook isn't executed when the toolbox is closed, but theme-apply
      // is executed when the toolbox is opened again.
      if (doc.getElementById("firebug-menu-button"))
        return;

      let toolbar = doc.querySelector("toolbar.devtools-tabbar");
      let button = new ToolbarButton({
        id: "firebug-menu-button",
        toolbar: toolbar,
        referenceElement: toolbar.firstChild,
        type: "menu",
        image: "chrome://firebug/skin/firebugSmall.svg",
        tooltiptext: "Firebug Menu",
        items: this.getFirebugMenuItems()
      });

      // Remember the <toolbarbutton> element, so we can remove it later.
      this.button = button.button;

    }).then(null, TraceError.sysout);
  },

  onUnapplyTheme: function(win, newTheme) {
    Win.loaded(win).then(doc => {
      if (this.button) {
        this.button.remove();
        this.button = null;
      }
    })
  },

  // Menu Actions

  getFirebugMenuItems: function() {
    var items = [];

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.About") + " " + self.version,
      command: this.onAbout.bind(this)
    });

    return items;
  },

  onAbout: function() {
    AddonManager.getAddonByID(self.id, function (addon) {
      let browser = getMostRecentBrowserWindow();
      browser.openDialog("chrome://mozapps/content/extensions/about.xul", "",
        "chrome,centerscreen,modal", addon);
    });
  }
});

// Exports from this module
exports.FirebugMenu = FirebugMenu;
