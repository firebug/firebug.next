/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Arr } = require("../core/array.js");

/**
 * This object is responsible for listening and tracing RDP packets.
 * It's intended for debugging purposes only.
 *
 * TODO:
 * 1. User interface for filtering displayed packets.
 *    See also onPacket method.
 */
function Hooks(client, listeners) {
  this.client = client;
  this.listeners = listeners;
}

Hooks.prototype =
/** @lends Hooks */
{
  onPacket: function onPacket(packet) {
    // Ignore newGlobal packets for now.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=801084
    if (packet.type != "newGlobal" && packet.type != "newSource") {
      // xxxHonza: should be associated with DBG_CONNECTION option
      Trace.sysout("PACKET RECEIVED; " + JSON.stringify(packet), packet);

      this.listeners.forEach(listener => {
        listener.onReceivePacket(packet);
      });
    }

    this.client.onPacket.apply(this.client, arguments);
  },

  onClosed: function(status) {
    this.client.onClosed(status);
  }
};

// Hook transport of given client object.
function TransportHooks(client) {
  this.client = client;
  this.listeners = [];
}

TransportHooks.prototype =
{
  hook: function() {
    // If the tracing for this module isn't even active do not register hooks.
    if (!Trace.active) {
      //return;
    }

    // Bail out if already hooked.
    if (this.hooked) {
      return;
    }

    this.hooked = true;

    Trace.sysout("TransportHooks.hook;", this);

    let transport = this.client._transport;

    this.originalHooks = transport.hooks;
    transport.hooks = new Hooks(this.client, this.listeners);

    this.originalSend = transport.send;
    transport.send = function(packet) {
      Trace.sysout("PACKET SEND " + JSON.stringify(packet), packet);

      this.listeners.forEach(listener => {
        listener.onSendPacket(packet);
      });

      this.originalSend.apply(transport, arguments);
    }.bind(this);
  },

  unhook: function() {
    Trace.sysout("TransportHooks.unhook; ", this);

    if (!this.hooked) {
      return;
    }

    let transport = this.client._transport;
    if (transport) {
      transport.hooks = this.originalHooks;
      transport.send = this.originalSend;
    }
  },

  // Listeners

  addListener: function(listener) {
    this.listeners.push(listener);
  },

  removeListener: function(listener) {
    Arr.remove(this.listeners, listener);
  },
}

// Exports from this module
exports.TransportHooks = TransportHooks;
