/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Menu } = require("./menu.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * This object represents a tab menu that is used for options and
 * displayed within a panel tab as a little black triangle.
 */
var TabMenu = {

  /**
   * Overlay existing panel with a tab menu. 
   */
  initialize: function(toolbox, panelId) {
    let panelTabId = "toolbox-tab-" + panelId;
    let tab = toolbox.doc.getElementById(panelTabId);
    if (tab.tabMenu)
      return;
    if (panelId == "options")
      return;

    // Create tab menu box.
    let doc = toolbox.doc;
    let tabMenu = doc.createElementNS(XUL_NS, "box");
    tabMenu.classList.add("panelTabMenu");

    // xxxHonza: ugh, how to handle events from the menu-target
    // element? It looks like elements within <radio> don't fire
    // mousedown events.
    tab.addEventListener("mousedown", this.openPopup.bind(this)); 

    // Create menu target.
    let menuTarget = doc.createElementNS(XUL_NS, "image");
    menuTarget.setAttribute("id", panelTabId + "-menu");
    menuTarget.classList.add("menuTarget");
    tabMenu.appendChild(menuTarget);

    let popup = doc.createElementNS(XUL_NS, "menupopup");
    popup.classList.add("menuPopup");
    tabMenu.appendChild(popup);

    tab.appendChild(tabMenu);

    // xxxHonza: we might want to store those somewhere else.
    tab.tabMenu = tabMenu;
    tab.tabMenuPopup = popup;
    tab.toolbox = toolbox;
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

    if (typeof panel.getOptionsMenuItems != "function")
      return;

    return panel.getOptionsMenuItems();
  }
}

// Exports from this module
exports.TabMenu = TabMenu;
