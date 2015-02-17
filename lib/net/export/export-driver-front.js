/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { ExportDriverActor } = require("./export-driver-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front TODO docs
 */
var ExportDriverFront = FrontClass(ExportDriverActor,
/** @lends ExportDriverFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("ExportDriverFront.initialize;", this);

    this.actorID = form[ExportDriverActor.prototype.typeName];
    this.manage(this);
  },

  onPacket: function(packet) {
    Front.prototype.onPacket.apply(this, arguments);

    Trace.sysout("ExportDriverFront.onPacket; " + JSON.stringify(packet),
      packet);

    let type = packet.type;

    switch (type) {
    case "clear":
      this.toolbox.networkMonitor.clear();
      break;
    case "triggerExport":
      this.toolbox.networkMonitor.triggerExport();
      break;
    }
  },
});

// Exports from this module
exports.ExportDriverFront = ExportDriverFront;
