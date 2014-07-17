/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { loadSheet } = require("sdk/stylesheet/utils");
const { Class } = require("sdk/core/heritage");
const { Xul } = require("../core/xul.js");
const { Locale } = require("../core/locale.js");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { emit } = require("sdk/event/core");
const { BaseOverlay } = require("../chrome/baseOverlay.js");

Cu.import("resource://gre/modules/Services.jsm");

// XUL Builder
const { RADIO } = Xul;

/**
 * @overlay This object represents an overlay that is responsible
 * for customizing the Options panel.
 */
const OptionsOverlay = Class(
/** @lends OptionsOverlay */
{
  extends: BaseOverlay,

  // Initialization
  initialize: function(options) {
    Trace.sysout("optionsOverlay.initialize;", options);

    this.frame = options.panelFrame;
  },

  onReady: function(options) {
    BaseOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("optionsOverlay.onReady;", options);

    let doc = this.panel.panelWin.document;
    let win = doc.documentElement;
    let themeRadioGroup = doc.getElementById("devtools-theme-box");

    // Define template for new <radio> button: "Firebug theme".
    var radio = RADIO({
      "class": "",
      "value": "firebug",
      "label": Locale.$STR("options.label.firebugTheme")
    });

    // Render the button.
    radio.build(themeRadioGroup);

    // Update theme radio group value (the theme might be set to 'Firebug');
    let prefName = themeRadioGroup.getAttribute("data-pref");
    if (Services.prefs.getCharPref(prefName) == "firebug") {
      let radio = themeRadioGroup.querySelector("radio[value='firebug']");
      themeRadioGroup.selectedItem = radio;
    }

    // Load Firebug theme stylesheet for the Options panel.
    let optionsStylesUrl = "chrome://firebug/skin/options.css";
    loadSheet(this.panel.panelWin, optionsStylesUrl, "author");
  },

  destroy: function() {
  },

  onSwitchTheme: function(newTheme, oldTheme) {
    let doc = this.panel.panelWin.document;
    let classList = doc.documentElement.classList;

    Trace.sysout("optionsOverlay.onSwitchTheme; " + oldTheme + " -> "
      + newTheme + ", " + classList);

    if (newTheme == "firebug")
      classList.add("theme-firebug");
    else
      classList.remove("theme-firebug");
  },
});

// Exports from this module
exports.OptionsOverlay = OptionsOverlay;
