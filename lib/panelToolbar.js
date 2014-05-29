/* See license.txt for terms of usage */

"use strict";

// ********************************************************************************************* //
// Constants

const { Trace } = require("./trace.js");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Menu } = require("./menu.js");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// ********************************************************************************************* //
// Panel Toolbar

const PanelToolbar = Class({
  extends: EventTarget,
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    var doc = options.parentNode.ownerDocument;
    var box = doc.createElementNS(XUL_NS, "box");
    box.setAttribute("id", "panelToolbarBox");

    this.toolbar = doc.createElementNS(XUL_NS, "toolbar");
    this.toolbar.setAttribute("id", "panelToolbar");
    this.toolbar.setAttribute("customizable", "false");
    this.toolbar.setAttribute("iconsize", "small");
    //view.setAttribute("context", "toolbar-context-menu");
    this.toolbar.setAttribute("class", "chromeclass-toolbar");

    box.appendChild(this.toolbar);
    options.parentNode.appendChild(box);

    Trace.sysout("panelToolbar.initialize;", arguments);
  },

  addItem: function(item) {
    this.toolbar.appendChild(item);
  },

  createItems: function(items) {
    for (var item of items) {
        createToolbarButton(this.toolbar, item);
    }
  }
});

// ********************************************************************************************* //
// Toolbar Button

const ToolbarButton = Class({
  extends: EventTarget,
  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    var toolbar = options.toolbar;
    var doc = toolbar.toolbar.ownerDocument;

    var button = doc.createElementNS(XUL_NS, "toolbarbutton");
    button.setAttribute("id", options.id);
    button.setAttribute("class", "toolbarbutton-iconic");

    if (options.label)
        button.setAttribute("label", options.label);

    if (options.image)
        button.setAttribute("image", options.image);

    toolbar.toolbar.appendChild(button);

    return button;
  },
});

// ********************************************************************************************* //
// Helpers

function createToolbarButton(toolbar, button, before)
{
    if (typeof(button) == "string" && button.charAt(0) == "-")
        return createToolbarSeparator(toolbar, before);

    var doc = toolbar.ownerDocument;
    var toolbarButton = doc.createElementNS(XUL_NS, "toolbarbutton");

    setItemIntoElement(toolbarButton, button);

    if (before)
        toolbar.insertBefore(toolbarButton, before);
    else
        toolbar.appendChild(toolbarButton);

    return toolbarButton;
};

function setItemIntoElement(element, item)
{
    if (item.label)
    {
        //var label = item.nol10n ? item.label : Locale.$STR(item.label);
        element.setAttribute("label", item.label);
    }

    if (item.id)
        element.setAttribute("id", item.id);

    if (item.type)
        element.setAttribute("type", item.type);

    if (item.checked)
        element.setAttribute("checked", "true");

    if (item.disabled)
        element.setAttribute("disabled", "true");

    if (item.image)
        element.setAttribute("image", item.image);

    if (item.command)
        element.addEventListener("command", item.command, false);

    if (item.commandID)
        element.setAttribute("command", item.commandID);

    if (item.option)
        element.setAttribute("option", item.option);

    if (item.tooltiptext)
    {
        //var tooltiptext = item.nol10n ? item.tooltiptext : Locale.$STR(item.tooltiptext);
        element.setAttribute("tooltiptext", item.tooltiptext);
    }

    if (item.className)
        Css.setClass(element, item.className);

    if (item.key)
        element.setAttribute("accesskey", item.key);

    if (item.name)
        element.setAttribute("name", item.name);

    if (item.items)
        Menu.createMenuPopup(element, item);

    return element;
};

function createToolbarSeparator(toolbar, before)
{
    if (!toolbar.firstChild)
        return;

    var separator = toolbar.ownerDocument.createElement("toolbarseparator");
    if (before)
        toolbar.insertBefore(separator, before);
    else
        toolbar.appendChild(separator);

    return separator;
};


// ********************************************************************************************* //
// Registration

exports.PanelToolbar = PanelToolbar;
exports.ToolbarButton = ToolbarButton;

// ********************************************************************************************* //
