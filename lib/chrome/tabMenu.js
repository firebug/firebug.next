/* See license.txt for terms of usage */

"use strict";

var main = require("../main.js");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Menu } = require("./menu.js");
const { Xul } = require("../core/xul.js");
const { emit } = require("sdk/event/core");

// XUL Builder
const { BOX, IMAGE, MENUPOPUP } = Xul;

/**
 * This object represents a tab menu that is used for panel options.
 * It can be accessed/opened through a little black triangle that's
 * displayed within a panel tab next to the label. The menu is available
 * only if Firebug theme is activated.
 */
const TabMenu = Class(
/** @lends TabMenu */
{
  extends: EventTarget,

  /**
   * Overlay existing panel with a tab menu.
   */
  initialize: function(toolbox, panelId) {
    Trace.sysout("tabMenu.initialize; " + panelId, toolbox);

    let panelTabId = "toolbox-tab-" + panelId;
    let tab = toolbox.doc.getElementById(panelTabId);
    if (tab.tabMenu)
      return;

    if (panelId == "options")
      return;

    this.openPopup = this.openPopup.bind(this);
    this.onSelectPanel = this.onSelectPanel.bind(this);

    this.toolbox = toolbox;
    this.panelId = panelId;
    this.tab = tab;

    // xxxHonza: ugh, how to handle events from the menu-target
    // element? It looks like elements within <radio> don't fire
    // mousedown events.
    this.tab.addEventListener("mousedown", this.openPopup);

    // Build tab menu.
    let tabMenu = BOX({"class": "panelTabMenu"},
      IMAGE({"class": "menuTarget", "id": panelTabId + "-menu"}),
      MENUPOPUP({"class": "menuPopup"})
    ).build(tab);

    this.tabMenu = tabMenu;
    this.menuPopup = tabMenu.querySelector(".menuPopup");

    this.toolbox.on("select", this.onSelectPanel);
  },

  /**
   * Clean up the panel tab.
   */
  destroy: function() {
    Trace.sysout("tabMenu.destroy; " + this.panelId);

    if (this.tab) {
      this.tab.removeEventListener("mousedown", this.openPopup);
      this.tabMenu.remove();

      this.toolbox.off("select", this.onSelectPanel);

      this.tab = null;
      this.tabMenu = null;
      this.menuPopup = null;
      this.toolbox = null;
    }
  },

  onSelectPanel: function(eventId, panelId) {
    Trace.sysout("tabMenu.onSelectPanel; " + panelId);

    let items = this.getOptionsMenuItems();
    if (!items || !items.length) {
      this.tabMenu.setAttribute("collapsed", "true");
    }
  },

  openPopup: function(event) {
    Trace.sysout("tabMenu.openPopup;", this);

    let tab = event.target;
    let selected = tab.getAttribute("selected");
    if (selected != "true")
      return;

    let doc = tab.ownerDocument;
    let popup = tab.tabMenuPopup;

    let items = this.getOptionsMenuItems();
    if (!items || !items.length)
      return;

    // xxxHonza: do we need a utility object?
    while (this.menuPopup.lastChild)
      this.menuPopup.removeChild(this.menuPopup.lastChild);

    Menu.createMenuItems(this.menuPopup, items);

    let chrome = main.Firebug.getChrome(this.toolbox);
    emit(chrome, "showOptionsMenu", items, this.menuPopup);

    let popupBoxObject = this.menuPopup.popupBoxObject;
    popupBoxObject.setConsumeRollupEvent(popupBoxObject.ROLLUP_NO_CONSUME);

    let style = doc.defaultView.getComputedStyle(this.menuPopup, null);
    let rtlLanguage = style.direction == "rtl";

    let position = rtlLanguage ? "after_end" : "after_start";
    this.menuPopup.openPopup(tab, position, 0, 0, false, false);
  },

  getOptionsMenuItems: function() {
    let panel = this.toolbox.getCurrentPanel();

    Trace.sysout("tabMenu.getOptionsMenuItems;", panel);

    if (typeof panel.getOptionsMenuItems == "function")
      return panel.getOptionsMenuItems();

    // 'panelOverlay' is set into existing panel objects in {@BaseOverlay}
    if (panel.panelOverlay)
      return panel.panelOverlay.getOptionsMenuItems();
  }
});

// Exports from this module
exports.TabMenu = TabMenu;
