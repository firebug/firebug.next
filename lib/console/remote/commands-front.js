/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { CommandsActor } = require("./commands-actor.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");

/**
 * @front This object represents client side implementation of the
 * {@CommandsActor} actor. The client side logic should be responsible
 * for receiving log-packet (registration / unregistration) and trace them.
 */
let CommandsFront = FrontClass(CommandsActor,
/** @lends CommandsFront **/
{
  // Initialization
  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("commandsFront.initialize;");

    this.actorID = form[CommandsActor.prototype.typeName];
    this.manage(this);
  },
});

exports.CommandsFront = CommandsFront;
