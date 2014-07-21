/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js").get(module.id);

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

/**
 * Hook transport of given client object.
 *
 * @param transport
 */
function hook(client) {
  let transport = client._transport;
  transport.hooks = new Hooks(client);

  var send = transport.send;
  transport.send = function(packet) {
    Trace.sysout("PACKET SEND " + JSON.stringify(packet), packet);
    send.apply(transport, arguments);
  }
}

// Exports from this module
exports.hook = hook;
