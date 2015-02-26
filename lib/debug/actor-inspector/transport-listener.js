/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { System } = require("../../core/system.js");
const { Arr } = require("../../core/array.js");

/**
 * TODO: docs
 */
const TransportListener = Class(
/** @lends TransportListener */
{
  extends: EventTarget,

  // Initialization

  initialize: function(options) {
    Trace.sysout("TransportListener.initialize;", options);

    this.listeners = [];

    this.client = options.client;

    this.send = this.send.bind(this);
    this.onPacket = this.onPacket.bind(this);
    this.onBulkPacket = this.onBulkPacket.bind(this);
    this.startBulkSend = this.startBulkSend.bind(this);
    this.onClosed = this.onClosed.bind(this);

    let transport = this.client._transport;
    transport.on("send", this.send);
    transport.on("onPacket", this.onPacket);
    transport.on("onBulkPacket", this.onBulkPacket);
    transport.on("startBulkSend", this.startBulkSend);
    transport.on("onClosed", this.onClosed);
  },

  destroy: function() {
    Trace.sysout("TransportListener.destroy;");

    let transport = this.client._transport;
    transport.off("send", this.send);
    transport.off("onPacket", this.onPacket);
    transport.off("onBulkPacket", this.onBulkPacket);
    transport.off("startBulkSend", this.startBulkSend);
    transport.off("onClosed", this.onClosed);
  },

  // Connection Events

  send: function(eventId, packet) {
    Trace.sysout("PACKET SEND " + JSON.stringify(packet), packet);

    this.listeners.forEach(listener => {
      listener.onSendPacket(packet);
    });
  },

  onPacket: function(eventId, packet) {
    Trace.sysout("PACKET RECEIVED; " + JSON.stringify(packet), packet);

    this.listeners.forEach(listener => {
      listener.onReceivePacket(packet);
    });
  },

  startBulkSend: function(eventId, header) {
  },

  onBulkPacket: function(eventId, packet) {
  },

  onClosed: function(eventId, status) {
  },

  // Listeners

  addListener: function(listener) {
    this.listeners.push(listener);
  },

  removeListener: function(listener) {
    Arr.remove(this.listeners, listener);
  },
});

// Exports from this module
exports.TransportListener = TransportListener;
