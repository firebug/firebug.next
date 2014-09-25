/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { LoggerActor } = require("./logger-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front TODO: description
 */
var LoggerFront = FrontClass(LoggerActor,
/** @lends LoggerFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.call(this, client, form);

    Trace.sysout("loggerFront.initialize;", this);

    this.actorID = form.logger;
    this.manage(this);
  },

  onPacket: function(response) {
    Trace.sysout("loggerFront.onPacket; " + JSON.stringify(response),
      response);

    let type = response.type;
    switch (type) {
    case "attached":
      this.onAttached(response);
      break;
    case "log":
      this.onLog(response);
      break;
    }
  },

  onAttached: function(response) {
    Trace.sysout("loggerFront.onAttached;", response);
  },

  onLog: function(response) {
    Trace.sysout("loggerFront.onLog;", response);

    // TODO: Custom server side log rendering here

    //let hud = this.getWebConsole(tab);
    //let consoleMessage = new Messages.ConsoleGeneric(response);
    //hud.ui.output.addMessage(consoleMessage);
  }
});

// Helpers

// Should be client-side
// Note: Future work for special rendering.
/*Widgets.ObjectRenderers.add({
  byKind: "ChromeLoggerRemoteObject",
  render: function() {
    let preview = this.objectActor.preview;
    let className = preview.ownProperties.___class_name;
    delete preview.ownProperties.___class_name;
    Widgets.ObjectRenderers.byKind.Object.render.apply(this, arguments);
    this.element.querySelector(".cm-variable").textContent = className;
  },
});*/

function getWebConsole(tab) {
  let target = devtools.TargetFactory.forTab(tab);
  let toolbox = gDevTools.getToolbox(target);
  let panel = toolbox ? toolbox.getPanel("webconsole") : null;
  return panel ? panel.hud : null;
}

// Exports from this module
exports.LoggerFront = LoggerFront;
