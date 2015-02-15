/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const self = require("sdk/self");
const main = require("../main.js");

const { Cu } = require("chrome");
const { target } = require("../target.js");
const { Theme } = require("./theme.js");
const { setTimeout } = require("sdk/timers");
const { Tool } = require("dev/toolbox");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

/**
 * Helper registrar object that fires two events:
 * 1. 'onRegisterPanels'
 * 2. 'onUnregisterPanels'
 *
 * Panes (tools) that should be available only if the Firebug theme
 * is active can handle these events and call PanelRegistrar.registerPanel
 * and PanelRegistrar.registerPanel() methods at the right time.
 */
const PanelRegistrar =
/** @lends PanelRegistrar */
{
  // Initialization

  initialize: function() {
    this.onApplyTheme = this.onApplyTheme.bind(this);
    this.onUnapplyTheme = this.onUnapplyTheme.bind(this);

    Theme.addThemeListeners(this.onApplyTheme, this.onUnapplyTheme);

    if (Theme.isFirebugActive()) {
      this.onApplyTheme();
    }
  },

  shutdown: function() {
    Theme.removeThemeListeners(this.onApplyTheme, this.onUnapplyTheme);

    this.onUnapplyTheme();
  },

  // Theme Events

  /**
   * Custom Firebug panels are available only when the Firebug theme is
   * activated. So, make sure it's registered and unregistered properly
   * according to the theme activation.
   */
  onApplyTheme: function(win) {
    let toolbox = main.Firebug.getToolbox(win);
    if (!toolbox) {
      return;
    }

    let tabs = toolbox.doc.getElementById("toolbox-tabs");
    if (tabs) {
      setTimeout(() => {
        target.emit("onRegisterPanels", [this]);
      });
    }
  },

  onUnapplyTheme: function() {
    target.emit("onUnregisterPanels", [this]);
  },

  // Panel Registration API

  registerPanel: function(PanelClass) {
    let { id } = PanelClass.prototype;

    if (gDevTools.getToolDefinition(id)) {
      return;
    }

    const tool = new Tool({
      name: id + "Tool",
      panels: {
        firebugPanel: PanelClass
      }
    });
  },

  unregisterPanel: function(PanelClass) {
    let { id } = PanelClass.prototype;

    if (!gDevTools.getToolDefinition(id)) {
      return;
    }

    gDevTools.unregisterTool({
      id: id
    });
  }
};

// Registration
target.register(PanelRegistrar);

// Exports from this module
exports.PanelRegistrar = PanelRegistrar;
