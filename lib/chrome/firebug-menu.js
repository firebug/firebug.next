/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { ToolbarButton } = require("./panel-toolbar.js");
const { Win } = require("../core/window.js");
const { EventTarget } = require("sdk/event/target");
const { Locale } = require("../core/locale.js");

// URLs used in the Firebug Menu
const URL = {
  "main": "https://getfirebug.com",
  "discuss": "https://groups.google.com/forum/#!forum/firebug",
  "issues": "https://github.com/firebug/firebug.next/issues",
  "repository": "https://github.com/firebug/firebug.next/",
  "contribute": "https://getfirebug.com/getinvolved",
};

/**
 * This object represents 'Firebug icon menu' that is accessible through
 * Firebug icon located on the far left side of the main toolbox toolbar.
 *
 * xxxHonza: implementation of some menu items (such as UI Location)
 * should be shared with Firebug Start Button menu.
 */
const FirebugMenu = Class(
/** @lends FirebugMenu */
{
  extends: EventTarget,

  // Initialization

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);
  },

  destroy: function() {
  },

  // Theme API

  onApplyTheme: function(win, oldTheme) {
    Win.loaded(win).then(doc => {
      // The button can already exist. This may happen since theme-unapply
      // hook isn't executed when the toolbox is closed, but theme-apply
      // is executed when the toolbox is opened again.
      if (doc.getElementById("firebug-menu-button")) {
        return;
      }

      let toolbar = doc.querySelector("toolbar.devtools-tabbar");
      let button = new ToolbarButton({
        id: "firebug-menu-button",
        class: "command-button",
        toolbar: toolbar,
        referenceElement: toolbar.firstChild,
        type: "menu",
        image: "chrome://firebug/skin/firebugSmall.svg",
        tooltiptext: "firebug.menu.tip.FirebugMenu",
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

  // Menu Items

  getFirebugMenuItems: function() {
    let items = [];

    items.push({
      nol10n: true,
      label: Locale.$STR("firebug.menu.About") + " " + self.version,
      tooltiptext: Locale.$STR("firebug.menu.tip.About"),
      command: this.onAbout.bind(this)
    });

    items.push("-");

    items.push({
      label: "firebug.menu.online",
      tooltiptext: "firebug.menu.tip.online",
      items: this.getOnlineMenuItems.bind(this)
    });

    return items;
  },

  getOnlineMenuItems: function() {
    let items = [];

    items.push({
      label: "firebug.menu.website",
      tooltiptext: "firebug.menu.tip.website",
      command: this.visitWebsite.bind(this, "main")
    });

    items.push({
      label: "firebug.menu.forums",
      tooltiptext: "firebug.menu.tip.forums",
      command: this.visitWebsite.bind(this, "discuss")
    });

    items.push({
      label: "firebug.menu.issues",
      tooltiptext: "firebug.menu.tip.issues",
      command: this.visitWebsite.bind(this, "issues")
    });

    items.push({
      label: "firebug.menu.repository",
      tooltiptext: "firebug.menu.tip.repository",
      command: this.visitWebsite.bind(this, "repository")
    });

    items.push({
      label: "firebug.menu.contribute",
      tooltiptext: "firebug.menu.tip.contribute",
      command: this.visitWebsite.bind(this, "contribute")
    });

    return items;
  },

  // Commands

  visitWebsite: function(siteId) {
    let url = URL[siteId];
    if (url) {
      Win.openNewTab(url);
    }
  },

  onAbout: function() {
    main.Firebug.about();
  }
});

// Exports from this module
exports.FirebugMenu = FirebugMenu;
