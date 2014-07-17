/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

var self = require("sdk/self");

const { Panel } = require("../sdk/panel.js");
const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");
const { Xul } = require("../core/xul.js");
const { when } = require("sdk/event/utils");
const { Theme } = require("./theme.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const { BOX, VBOX, HBOX, SPLITTER } = Xul;

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 */
const BasePanel = Class(
/** @lends BasePanel */
{
  extends: Panel,

  /**
   * Executed by the framework after document in the panel becomes
   * interactive (`document.readyState === "interactive"`).
   */
  onReady: function(options) {
    Trace.sysout("basePanel.onReady;", options);

    this.panel = options.panel;

    if (this.frame)
      this.panelNode = this.frame.contentDocument.body;
    else
      TraceError.sysout("basePanel.onReady; ERROR no frame", this);

    // Register theme listener to receive notifications about theme changes.
    // Derived panel typically sets or removes global document class like:
    // 'theme-firebug' within onSwitchTheme() method.
    Theme.addThemeListener(this.onSwitchTheme.bind(this));
  },

  onSwitchTheme: function(newTheme, oldTheme) {
    // TODO: implement in derived panels.
    // xxxHonza: we might get direct API support for
    // setting the class attribute (e.g. 'theme-firebug')
    // in all toolbox iframes automatically.
  },

  /**
   * Executed by the framework when event "load" is fired for the document.
   * (`document.readySate === "complete"`).
   */
  onLoad: function() {
    Trace.sysout("basePanel.onLoad;", this);
  },

  setup: function({debuggee, frame, toolbox}) {
    Trace.sysout("basePanel.setup;", arguments);

    this.frame = frame;
    this.debuggee = debuggee;
    this.toolbox = toolbox;

    let parentNode = frame.parentNode;
    let doc = parentNode.ownerDocument;

    parentNode.style.MozBoxOrient = "horizontal";
    frame.style.visibility = "visible";

    // Definition of the new panel content layout.
    var content =
      HBOX({"class": "panelContent", "flex": "1"},
        VBOX({"id": "panelMainBox", "flex": "1"}),
        SPLITTER({"id": "panelSplitter", "valign": "top"},
          BOX({"id": "panelSplitterBox"})
        ),
        VBOX({"id": "panelSideBox", "width": "300px"})
      );

    // Build XUL DOM structure.
    var panelContent = content.build(parentNode);

    // Append a (inner) toolbar into the main panel.
    let mainBox = panelContent.querySelector("#panelMainBox");
    let mainToolbar = new PanelToolbar({
        parentNode: mainBox,
    });

    // Append the existing frame into the right location within
    // the new layout.
    mainBox.appendChild(frame);

    let items = this.getPanelToolbarButtons();
    if (items)
        mainToolbar.createItems(items);

    this.setupSidePanels(doc, panelContent);
  },

  setupSidePanels: function(doc, panelContent) {
    let sidePanels = this.getSidePanels();

    // Append a (inner) toolbar into the side panel box. This toolbar
    // can contain side panel tabs as well as standard toolbar buttons.
    let sideBox = panelContent.querySelector("#panelSideBox");
    let sideToolbar = new PanelToolbar({
      parentNode: sideBox,
    });

    // Create toolbar group for side panel tabs. Toolbar button (if any)
    // should be created outside of this group.
    let tabs = doc.createElementNS(XUL_NS, "hbox");
    tabs.id = "toolbox-sidetabs";
    sideToolbar.toolbar.appendChild(tabs);

    let sidePanelBox = doc.createElementNS(XUL_NS, "deck");
    sidePanelBox.setAttribute("id", "sidePanelDeck");
    sidePanelBox.setAttribute("flex", "1");
    //sidePanelBox.style.visibility = "hidden";

    this.sidePanels = [];

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
        "type": "chrome", // Set to chrome, see issue #15
        "flex": "1",
        "transparent": true,
        "seamless": "seamless"
      });

      sidePanelBox.appendChild(frame);

      let panel = new Panel();
      this.sidePanels.push(panel);

      panel.setup({frame: frame, toolbox: this.toolbox});

      // xxxHonza: can we use when (from "sdk/event/utils")?
      frame.addEventListener("load", event => {
        panel.onReady(frame);
      }, true);

      sideBox.appendChild(sidePanelBox);
    }

    // Select the first side-panel by default. If the panel doesn't have
    // any side panels, collapse the entire side panel area.
    if (tabs.firstChild) {
      this.selectSidePanel(tabs.firstChild);
    }
    else {
      sideBox.style.display = "none";
    }
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

  /**
   * Returns a number indicating the view's ability to inspect the object.
   * Zero means not supported, and higher numbers indicate specificity.
   */
  supportsObject: function(object) {
    return 0;
  },

  // Selection
  select: function(object) {
  }
});

// Private helpers
// xxxHonza: dup from SDK
const setAttributes = (node, attributes) => {
  for (var key in attributes)
    node.setAttribute(key, attributes[key]);
};


// Exports from this module
exports.BasePanel = BasePanel;
