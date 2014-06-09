/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace } = require("../trace.js");

// Transport hooks
function Hooks(client) {
  this.client = client;
}

Hooks.prototype =
{
  onPacket: function onPacket(packet)
  {
    // Ignore newGlobal packets for now.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=801084
    if (packet.type == "newGlobal")
      return;

    // xxxHonza: should be associated with DBG_CONNECTION option
    Trace.sysout("PACKET RECEIVED; " + JSON.stringify(packet), packet);

    this.client.onPacket.apply(this.client, arguments);
  },

  onClosed: function(status) {
    this.client.onClosed(status);
  }
};

// Exports from this module
exports.Hooks = Hooks;
