/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

var self = require("sdk/self");

const { Panel } = require("./sdk/panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("./trace.js");
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 */
const BasePanel = Class({
/** @lends BasePanel */
  extends: Panel,

  onReady: function() {
    Trace.sysout("basePanel.onReady;", this);
  },

  onLoad: function() {
    Trace.sysout("basePanel.onLoad;", this);
  },

  setup: function({debuggee, frame}) {
    Trace.sysout("basePanel.setup;", arguments);

    this.debuggee = debuggee;

    let parentNode = frame.parentNode;
    let doc = parentNode.ownerDocument;

    parentNode.style.MozBoxOrient = "horizontal";
    frame.style.visibility = "visible";

    let mainBox = doc.createElementNS(XUL_NS, "vbox");
    mainBox.setAttribute("id", "panelMainBox");
    mainBox.setAttribute("flex", "1");

    let sideBox = doc.createElementNS(XUL_NS, "vbox");
    sideBox.setAttribute("id", "panelSideBox");
    sideBox.setAttribute("width", "300px");

    let splitter = doc.createElementNS(XUL_NS, "splitter");
    splitter.setAttribute("id", "panelSplitter");
    splitter.setAttribute("valign", "top");

    let splitterBox = doc.createElementNS(XUL_NS, "box");
    splitterBox.setAttribute("id", "panelSplitterBox");
    splitter.appendChild(splitterBox);

    let mainToolbar = new PanelToolbar({
        parentNode: mainBox,
    });

    mainBox.appendChild(frame);

    let items = this.getPanelToolbarButtons();
    if (items)
        mainToolbar.createItems(items);

    let sideToolbar = new PanelToolbar({
        parentNode: sideBox,
    });

    var tabs = doc.createElementNS(XUL_NS, "hbox");
    tabs.id = "toolbox-sidetabs";
    sideToolbar.toolbar.appendChild(tabs);

    parentNode.appendChild(mainBox);
    parentNode.appendChild(splitter);
    parentNode.appendChild(sideBox);

    this.setupSidePanels(doc, sideBox, tabs);
  },

  setupSidePanels: function(doc, sideBox, tabs) {
    let sidePanels = this.getSidePanels();

    let sidePanelBox = doc.createElementNS(XUL_NS, "deck");
    sidePanelBox.setAttribute("id", "sidePanelDeck");
    sidePanelBox.setAttribute("flex", "1");
    //sidePanelBox.style.visibility = "hidden";

    for (let Panel of sidePanels) {
      const { url, label, tooltip, icon } = Panel.prototype;
      const { id } = Panel.prototype;

      let radio = doc.createElementNS(XUL_NS, "radio");
      radio.className = "devtools-tab devtools-sidetab";
      radio.id = "toolbox-sidetab-" + id;
      radio.setAttribute("toolid", id);
      radio.setAttribute("tooltiptext", tooltip);

      radio.addEventListener("command",
          this.onSelectSidePanel.bind(this, id));

      let labelNode = doc.createElementNS(XUL_NS, "label");
      labelNode.setAttribute("value", label)
      labelNode.setAttribute("crop", "end");
      labelNode.setAttribute("flex", "1");
      radio.appendChild(labelNode);

      tabs.appendChild(radio);

      let frame = doc.createElementNS(XUL_NS, "iframe");
      setAttributes(frame, {
        "src": self.data.url(url),
        "sandbox": "allow-scripts",
        // "remote": true,
        "type": "content",
        "flex": "1",
        "transparent": true,
        "seamless": "seamless"
      });

      sidePanelBox.appendChild(frame);

      let panel = new Panel();
      panel.setup({frame: frame});

      sideBox.appendChild(sidePanelBox);
    }

    // Select the First tab by default.
    this.selectSidePanel(tabs.firstChild);
  },

  onSelectSidePanel: function(type, event) {
    Trace.sysout("basePanel.onSelectSidePanel", event);

    let tab = event.target;
    this.selectSidePanel(tab);
  },

  selectSidePanel: function(tab) {
    let doc = tab.ownerDocument;
    let selected = doc.querySelector(".devtools-sidetab[selected]");
    if (selected)
      selected.removeAttribute("selected");

    tab.setAttribute("selected", "true");

    // select the right tab, making 0th index the default tab if right tab not
    // found
    let index = 0;
    let tabstrip = doc.getElementById("toolbox-sidetabs");
    let tabs = tabstrip.childNodes;
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i] === tab) {
        index = i;
        break;
      }
    }

    tabstrip.selectedItem = tab;

    // and select the right iframe
    let deck = doc.getElementById("sidePanelDeck");
    deck.selectedIndex = index;
  },

  getPanelToolbarButtons: function() {
    return null;
  },

  dispose: function() {
    Trace.sysout("basePanel.dispose;");
    delete this.debuggee;
  },

  show: function() {
    Trace.sysout("basePanel.show;");
  },

  getSidePanels: function() {
    return [];
  },

  /**
   * Returns a list of menu items for panel options menu.
   */
  getOptionsMenuItems: function() {
    return [];
  },
});

// Private helpers
// xxxHonza: dup from SDK
const setAttributes = (node, attributes) => {
  for (var key in attributes)
    node.setAttribute(key, attributes[key]);
};


// Exports from this module
exports.BasePanel = BasePanel;
