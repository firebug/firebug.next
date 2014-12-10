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

const { ConsoleAPI } = Cu.import("resource://gre/modules/devtools/Console.jsm", {});
const ConsoleAPIMethods = Object.getOwnPropertyNames(ConsoleAPI.prototype);

/**
 * @front This object represents client side implementation of the
 * {@LoggerActor} actor. The client side logic should be responsible
 * for receiving log-packet and rendering them within the Console panel.
 * TODO: custom rendering isn't implemented yet.
 */
var LoggerFront = FrontClass(LoggerActor,
/** @lends LoggerFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("loggerFront.initialize;", this);

    this.actorID = form[LoggerActor.prototype.typeName];
    this.manage(this);
  },

  onPacket: function(packet) {
    Front.prototype.onPacket.apply(this, arguments);

    Trace.sysout("loggerFront.onPacket; " + JSON.stringify(packet),
      packet);

    let type = packet.type;

    switch (type) {
    case "attached":
      this.onAttached(packet);
      break;
    case "detached":
      this.onDetached(packet);
      break;
    case "log":
      this.onLog(packet);
      break;
    }
  },

  onAttached: function(response) {
    Trace.sysout("loggerFront.onAttached; ", response);
  },

  onDetached: function(response) {
    Trace.sysout("loggerFront.onDetached; ", response);
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
