/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { InspectorActor } = require("./inspector-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front TODO: documentation
 */
var InspectorFront = FrontClass(InspectorActor,
/** @lends InspectorFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("inspectorFront.initialize;", this);

    this.actorID = form[InspectorActor.prototype.typeName];
    this.manage(this);
  },

  onAttached: function(response) {
    Trace.sysout("inspectorFront.onAttached; ", response);
  },

  onDetached: function(response) {
    Trace.sysout("inspectorFront.onDetached; ", response);
  },
});

// Helpers

// Exports from this module
exports.InspectorFront = InspectorFront;
