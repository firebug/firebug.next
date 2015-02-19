/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { target } = require("../target.js");

/**
 * TODO docs
 */
const TransportHooks =
/** @lends TransportHooks */
{
  // Initialization

  initialize: function(Firebug) {
    Trace.sysout("TransportHooks.initialize;", arguments);

    this.send = this.send.bind(this);
    this.onPacket = this.onPacket.bind(this);
  },

  shutdown: function(Firebug) {
    Trace.sysout("TransportHooks.shutdown;");
  },

  // Toolbox Events

  onToolboxCreated: function(eventId, toolbox) {
    Trace.sysout("TransportHooks.onToolboxCreated;");

    let remotePromise = toolbox.target.makeRemote();
    let client = toolbox.target.client;
    this.register(client);

    client.addOneTimeListener("closed", event => {
      this.unregister(client);
    });
  },

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("TransportHooks.onToolboxReady;", toolbox);
  },

  onToolboxDestroy: function(eventId, toolbox) {
    Trace.sysout("TransportHooks.onToolboxDestroy;");
  },

  // Transport Listener

  register: function(client) {
    let transport = client._transport;
    transport.on("send", this.send);
    transport.on("onPacket", this.onPacket);
  },

  unregister: function(client) {
    let transport = client._transport;
    transport.off("send", this.send);
    transport.off("onPacket", this.onPacket);
  },

  // Transport Events

  send: function(eventId, packet) {
    Trace.sysout("PACKET SEND " + JSON.stringify(packet), packet);
  },

  onPacket: function(eventId, packet) {
    Trace.sysout("PACKET RECEIVED; " + JSON.stringify(packet), packet);
  },
};

// Registration
target.register(TransportHooks);

// Exports from this module
exports.TransportHooks = TransportHooks;
