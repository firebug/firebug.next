/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Menu } = require("./menu.js");
const { Xul } = require("../core/xul.js");

// XUL Builder
const { BOX, IMAGE, MENUPOPUP } = Xul;

/**
 * This object represents a tab menu that is used for options.
 * It can be accessed/opened through a little black triangle that's
 * displayed within a panel tab next to the label.
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

    this.toolbox = toolbox;
    this.panelId = panelId;
    this.tab = tab;

    // xxxHonza: ugh, how to handle events from the menu-target
    // element? It looks like elements within <radio> don't fire
    // mousedown events.
    tab.addEventListener("mousedown", this.openPopup);

    // Build tab menu.
    let tabMenu = BOX({"class": "panelTabMenu"},
      IMAGE({"class": "menuTarget", "id": panelTabId + "-menu"}),
      MENUPOPUP({"class": "menuPopup"})
    ).build(tab);

    // xxxHonza: we might want to store those somewhere else.
    tab.tabMenu = tabMenu;
    tab.tabMenuPopup = tabMenu.querySelector(".menuPopup");
    tab.toolbox = toolbox;
  },

  destroy: function() {
    Trace.sysout("tabMenu.destroy; " + this.panelId);

    if (this.tab)
      this.tab.removeEventListener("mousedown", this.openPopup);
  },

  openPopup: function(event) {
    Trace.sysout("tabMenu.openPopup;", event);

    let tab = event.target;
    let selected = tab.getAttribute("selected");
    if (selected != "true")
      return;

    let doc = tab.ownerDocument;
    let popup = tab.tabMenuPopup;

    let items = this.getOptionsMenuItems(tab);
    if (!items || !items.length)
      return;

    // xxxHonza: do we need a utility object?
    while (popup.lastChild)
        popup.removeChild(popup.lastChild);

    Menu.createMenuItems(popup, items);

    // xxxHonza: {extension-point}
    //Firebug.dispatch("onOptionsMenu", [context, panel, items]);

    let popupBoxObject = popup.popupBoxObject;
    popupBoxObject.setConsumeRollupEvent(popupBoxObject.ROLLUP_NO_CONSUME);

    let style = doc.defaultView.getComputedStyle(popup, null);
    let rtlLanguage = style.direction == "rtl";

    let position = rtlLanguage ? "after_end" : "after_start";
    popup.openPopup(tab, position, 0, 0, false, false);
  },

  getOptionsMenuItems: function(tab) {
    let toolbox = tab.toolbox;
    let panel = toolbox.getCurrentPanel();

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
