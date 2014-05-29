/* See license.txt for terms of usage */

"use strict";

// ********************************************************************************************* //
// Constants

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("./trace.js");
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { loadSheet } = require("sdk/stylesheet/utils");
const { SearchBox } = require("./searchBox.js");
const { defer } = require('sdk/core/promise');

// Extension modules
require("./helloWorldPanel.js");
require("./pageContextMenu.js");
require("./toolbarButton.js");
require("./windowWatcher.js");

// ********************************************************************************************* //
// Main

function main(options, callbacks)
{
    Trace.sysout("main.main;", options);
}

function onUnload(reason)
{
    Trace.sysout("main.onUnload" + reason);
}

function onToolboxReady(event, toolbox)
{
    Trace.sysout("onToolboxReady");

    var doc = toolbox.doc;
    var frame = toolbox.frame;

    var url = self.data.url("searchBox.xml");
    Trace.sysout("main.onToolboxReady; " + url, toolbox);

    var styles = [
      "toolbox.css",
      "toolbars.css",
      "buttons.css",
      "splitter.css",
      "searchbox.css",
    ];

    var win = frame.contentWindow;
    for (var style of styles)
    {
        var url = self.data.url("firebug-theme/" + style);
        loadSheet(win, url, "author");
    }

    doc.documentElement.classList.add("theme-firebug");

    var tabs = doc.querySelectorAll(".devtools-tab");
    for (let tab of tabs)
        tab.removeAttribute("flex");

    // Search Box
    var tabBar = doc.querySelector(".devtools-tabbar");
    var searchBox = new SearchBox({
        parentNode: tabBar,
        reference: doc.querySelector("#toolbox-controls-separator")
    });

    getPanelWhenReady(toolbox, "webconsole").then((panel) =>
    {
        Trace.sysout("Web console ready " + panel._frameWindow.content.id, panel);

        loadSheet(panel._frameWindow, self.data.url("firebug-theme/webconsole.css"), "author");
    });
}

function onToolboxDestroyed(target)
{
    Trace.sysout("main.onToolboxDestroyed;", target);
}

// ********************************************************************************************* //
// Helpers

function getPanelWhenReady(toolbox, id) {
  let deferred = defer();
  let panel = toolbox.getPanel(id);
  if (panel) {
    deferred.resolve(panel);
  } else {
    toolbox.once(id + "-ready", panel => {
      deferred.resolve(panel);
    });
  }
  return deferred.promise;
}

// ********************************************************************************************* //
// Registration

gDevTools.on("toolbox-ready", onToolboxReady);
gDevTools.on("toolbox-destroyed", onToolboxDestroyed);

// ********************************************************************************************* //
// Exports

exports.main = main;
exports.onUnload = onUnload;

// ********************************************************************************************* //
