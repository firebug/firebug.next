/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Panel } = require("dev/panel");
const { Class } = require("sdk/core/heritage");
const { Trace } = require("./trace.js");
const { PanelToolbar, ToolbarButton } = require("./panelToolbar.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 */
const BasePanel = Class({
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

    var parentNode = frame.parentNode;
    var doc = parentNode.ownerDocument;

    parentNode.style.MozBoxOrient = "horizontal";
    frame.style.visibility = "visible";

    var mainBox = doc.createElementNS(XUL_NS, "vbox");
    mainBox.setAttribute("id", "panelMainBox");
    mainBox.setAttribute("flex", "1");

    var sideBox = doc.createElementNS(XUL_NS, "vbox");
    sideBox.setAttribute("id", "panelSideBox");
    sideBox.setAttribute("width", "300px");

    var splitter = doc.createElementNS(XUL_NS, "splitter");
    splitter.setAttribute("id", "panelSplitter");
    splitter.setAttribute("valign", "top");

    var splitterBox = doc.createElementNS(XUL_NS, "box");
    splitterBox.setAttribute("id", "panelSplitterBox");
    splitter.appendChild(splitterBox);

    var mainToolbar = new PanelToolbar({
        parentNode: mainBox,
    });

    mainBox.appendChild(frame);

    var items = this.getPanelToolbarButtons();
    if (items)
        mainToolbar.createItems(items);

    var sideToolbar = new PanelToolbar({
        parentNode: sideBox,
    });

    var sideToolbar = new ToolbarButton({
        toolbar: sideToolbar,
        label: "Side Button",
    });

    parentNode.appendChild(mainBox);
    parentNode.appendChild(splitter);
    parentNode.appendChild(sideBox);
  },

  getPanelToolbarButtons: function() {
    return null;
  },

  dispose: function() {
    Trace.sysout("basePanel.dispose;");
    delete this.debuggee;
  },
});

// Exports from this module
exports.BasePanel = BasePanel;
