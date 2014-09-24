/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { LoggerActor } = require("./logger-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

let protocol = devtools["require"]("devtools/server/protocol");
let { Front, FrontClass } = protocol;

/**
 * @front TODO: description
 */
var LoggerFront = FrontClass(LoggerActor,
/** @lends LoggerFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.call(this, client, form);

    Trace.sysout("loggerFront.initialize;", form);

    this.actorID = form.logger;
    this.manage(this);
  }
});

// Exports from this module
exports.LoggerFront = LoggerFront;
