/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { MonitorActor } = require("./monitor-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front TODO: documentation
 */
var MonitorFront = FrontClass(MonitorActor,
/** @lends MonitorFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("monitorFront.initialize;", this);

    this.actorID = form[MonitorActor.prototype.typeName];
    this.manage(this);
  },

  onAttached: function(response) {
    Trace.sysout("monitorFront.onAttached; ", response);
  },

  onDetached: function(response) {
    Trace.sysout("monitorFront.onDetached; ", response);
  },
});

// Helpers

// Exports from this module
exports.MonitorFront = MonitorFront;
