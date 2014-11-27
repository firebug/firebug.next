/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { main, Firebug } = require("../lib/index.js");
const { openToolbox, closeToolbox } = require("dev/utils");
const { getTabWhenReady } = require("./window.js");
const { defer } = require("sdk/core/promise");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

function getToolDefinition(toolId) {
  return gDevTools.getToolDefinition(toolId);
}

function showToolbox(tab, panelId) {
  let deferred = defer();

  let target = devtools.TargetFactory.forTab(tab);
  gDevTools.showToolbox(target, panelId).then(toolbox => {
    deferred.resolve({toolbox: toolbox});
  });

  return deferred.promise;
}

function getToolboxWhenReady(url, panelId, config = {}) {
  let deferred = defer();

  getTabWhenReady("about:blank").then(({tab}) => {
    showToolbox(tab, panelId).then(({toolbox}) => {
      deferred.resolve({toolbox: toolbox, tab: tab});
    });
  });

  return deferred.promise;
}

// Exports from this module
exports.getToolDefinition = getToolDefinition;
exports.showToolbox = showToolbox;
exports.getToolboxWhenReady = getToolboxWhenReady;