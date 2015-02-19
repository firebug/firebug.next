/* See license.txt for terms of usage */

"use strict";

const main = require("../main.js");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Menu } = require("./menu.js");
const { Xul } = require("../core/xul.js");
const { emit } = require("sdk/event/core");
const { Dom } = require("../core/dom.js");

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
  initialize: function(panel, doc, tabIdPrefix, owner) {
    Trace.sysout("tabMenu.initialize; " + panel.id);

    this.panel = panel;
    this.toolbox = panel.toolbox;
    this.doc = doc;
    this.owner = owner;
    this.tabIdPrefix = tabIdPrefix;

    let panelTabId = tabIdPrefix + panel.id;
    let tab = this.doc.getElementById(panelTabId);
    if (!tab) {
      TraceError.sysout("tabMenu.initialize; ERROR no tab! " + panelTabId);
      return;
    }

    this.tab = tab;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onSelectPanel = this.onSelectPanel.bind(this);

    // xxxHonza: ugh, how to handle events from the menu-target
    // element? It looks like elements within <radio> don't fire
    // mousedown events.
    this.tab.addEventListener("mousedown", this.onMouseDown);

    this.owner.on("select", this.onSelectPanel);
  },

  /**
   * Clean up the panel tab.
   */
  destroy: function() {
    Trace.sysout("tabMenu.destroy; " + this.panel.id);

    // Destroy associated {@TabMenu} object. Note that it doesn't
    // have to exist if the panel was never selected. It's created
    // on demand when the panel is selected for the first time
    // (see onSelectPanel method).
    if (this.tab) {
      this.tab.removeEventListener("mousedown", this.onMouseDown);

      if (this.tabMenu) {
        this.tabMenu.remove();
        this.tab.tabMenu = null;
      }

      this.owner.off("select", this.onSelectPanel);

      this.tab = null;
      this.tabMenu = null;
      this.menuPopup = null;
      this.toolbox = null;
    }
  },

  onSelectPanel: function(eventId, panelId) {
    Trace.sysout("tabMenu.onSelectPanel; " + panelId);

    // Only handle the event if it's related to the panel
    // this tab menu instance is associated with.
    if (panelId != this.panel.overlayId) {
      return;
    }

    // Create tab menu XUL structure. It should be created
    // when the <tab> binding is fully applied.
    // (is the binding applied when the tab is visible for the first time?)
    if (!this.tab.tabMenu) {
      this.initTabMenu();
    }

    // xxxHonza: support for runtime check:
    // Assert.ok(panelId == this.panel.id, "Panel id must match");

    let items = this.getOptionsMenuItems();
    let menuPopup = this.getOptionsMenuPopup();

    // The options menu target is visible only if the panel is
    // providing any menu items or entire custom menu popup.
    let collapsed = (!menuPopup && (!items || !items.length));
    this.tabMenu.setAttribute("fb-collapsed", collapsed ? "true" : "false");

    // See the comment in onMouseDown() method below.
    this.lastSelectEvent = Date.now();
  },

  onMouseDown: function(event) {
    Trace.sysout("tabMenu.onMouseDown;", event);

    let tab = event.target;

    // Do not open the menu if the user clicked the tab to select
    // the associated panel (and it's just going to be selected).
    if (!tab.getAttribute("selected")) {
      return;
    }

    // The 'select' event comes just before the 'mousedown' event
    // (in case of <tabbox> used for side panels) and there is no way
    // to see that the click changed selected tab. In such case the menu
    // should *not* be opened. So, let's use the timing and bail out
    // in such case.
    // xxxHonza: Is there any better way?
    if (Date.now() - this.lastSelectEvent < 20) {
      return;
    }

    // If no custom menu popup is provided by the associated panel
    // let's use the default one.
    let menuPopup = this.getOptionsMenuPopup();
    if (!menuPopup) {
      this.initPopup(tab);
      menuPopup = this.menuPopup;
    }

    let doc = tab.ownerDocument;
    let style = doc.defaultView.getComputedStyle(menuPopup, null);
    let rtlLanguage = style.direction == "rtl";

    let position = rtlLanguage ? "after_end" : "after_start";
    menuPopup.openPopup(tab, position, 0, 0, false, false);
  },

  initTabMenu: function() {
    if (this.tab.tabMenu) {
      return;
    }

    // Build tab menu.
    let panelTabId = this.tabIdPrefix + this.panel.id;
    let tabMenu = BOX({"class": "panelTabMenu"},
      IMAGE({"class": "menuTarget", "id": panelTabId + "-menu"}),
      MENUPOPUP({"class": "menuPopup"})
    ).build(this.tab);

    this.tabMenu = this.tab.tabMenu = tabMenu;
    this.menuPopup = tabMenu.querySelector(".menuPopup");
  },

  initPopup: function(tab) {
    Trace.sysout("tabMenu.initPopup;");

    let selected = tab.getAttribute("selected");
    if (selected != "true") {
      return;
    }

    let items = this.getOptionsMenuItems();
    if (!items || !items.length) {
      return;
    }

    Dom.clearNode(this.menuPopup);

    Menu.createMenuItems(this.menuPopup, items);

    let chrome = main.Firebug.getChrome(this.toolbox);
    emit(chrome, "showOptionsMenu", items, this.menuPopup);

    let popupBoxObject = this.menuPopup.popupBoxObject;
    popupBoxObject.setConsumeRollupEvent(popupBoxObject.ROLLUP_NO_CONSUME);
  },

  getOptionsMenuItems: function() {
    return this.panel.getOptionsMenuItems();
  },

  getOptionsMenuPopup: function() {
    return this.panel.getOptionsMenuPopup();
  }
});

// Exports from this module
exports.TabMenu = TabMenu;
