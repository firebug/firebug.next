/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

function NetworkEventsHandler(webConsoleClient, client) {
  this.webConsoleClient = webConsoleClient;
  this.client = client;

  this.onNetworkEvent = this.onNetworkEvent.bind(this);
  this.onNetworkEventUpdate = this.onNetworkEventUpdate.bind(this);
  this.onRequestHeaders = this.onRequestHeaders.bind(this);
  this.onRequestCookies = this.onRequestCookies.bind(this);
  this.onRequestPostData = this.onRequestPostData.bind(this);
  this.onResponseHeaders = this.onResponseHeaders.bind(this);
  this.onResponseCookies = this.onResponseCookies.bind(this);
  this.onResponseContent = this.onResponseContent.bind(this);
  this.onEventTimings = this.onEventTimings.bind(this);
}

/**
 * TODO: docs
 */
NetworkEventsHandler.prototype = {
/** @lends NetworkEventsHandler */

  // Connection

  connect: function() {
    Trace.sysout("NetworkEventsHandler.connect;");

    this.client.addListener("networkEvent", this.onNetworkEvent);
    this.client.addListener("networkEventUpdate", this.onNetworkEventUpdate);
  },

  disconnect: function() {
    if (!this.client) {
      return;
    }

    Trace.sysout("NetworkEventsHandler.disconnect;");

    this.client.removeListener("networkEvent", this.onNetworkEvent);
    this.client.removeListener("networkEventUpdate", this.onNetworkEventUpdate);
  },

  // Event Handlers

  onNetworkEvent: function(aType, aPacket) {
    // Skip events from different console actors.
    if (aPacket.from != this.webConsoleClient.actor) {
      return;
    }

    Trace.sysout("NetworkEventsHandler.onNetworkEvent; " + aType, aPacket);

    let { actor, startedDateTime, method, url, isXHR } = aPacket.eventActor;
  },

  onNetworkEventUpdate: function(aType, aPacket) {
    let actor = aPacket.from;

    // TODO Skip events from unknown actors (not in the list).

    Trace.sysout("NetworkEventsHandler.onNetworkEventUpdate; " + aType, aPacket);

    switch (aPacket.updateType) {
      case "requestHeaders":
        this.webConsoleClient.getRequestHeaders(actor, this.onRequestHeaders);
        break;
      case "requestCookies":
        this.webConsoleClient.getRequestCookies(actor, this.onRequestCookies);
        break;
      case "requestPostData":
        this.webConsoleClient.getRequestPostData(actor, this.onRequestPostData);
        break;
      case "responseHeaders":
        this.webConsoleClient.getResponseHeaders(actor, this.onResponseHeaders);
        break;
      case "responseCookies":
        this.webConsoleClient.getResponseCookies(actor, this.onResponseCookies);
        break;
      case "responseStart":
        break;
      case "responseContent":
        this.webConsoleClient.getResponseContent(actor, this.onResponseContent);
        break;
      case "eventTimings":
        this.webConsoleClient.getEventTimings(actor, this.onEventTimings);
        break;
    }
  },

  /**
   * Handles additional information received for a "requestHeaders" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onRequestHeaders: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onRequestHeaders;", aResponse);
  },

  /**
   * Handles additional information received for a "requestCookies" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onRequestCookies: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onRequestCookies;", aResponse);
  },

  /**
   * Handles additional information received for a "requestPostData" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onRequestPostData: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onRequestPostData;", aResponse);
  },

  /**
   * Handles additional information received for a "responseHeaders" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onResponseHeaders: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onResponseHeaders;", aResponse);
  },

  /**
   * Handles additional information received for a "responseCookies" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onResponseCookies: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onResponseCookies;", aResponse);
  },

  /**
   * Handles additional information received for a "responseContent" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onResponseContent: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onResponseContent;", aResponse);
  },

  /**
   * Handles additional information received for a "eventTimings" packet.
   *
   * @param object aResponse
   *        The message received from the server.
   */
  onEventTimings: function(aResponse) {
    Trace.sysout("NetworkEventsHandler.onEventTimings;", aResponse);
  },

  /**
   * Fetches the full text of a LongString.
   *
   * @param object | string aStringGrip
   *        The long string grip containing the corresponding actor.
   *        If you pass in a plain string (by accident or because you're lazy),
   *        then a promise of the same string is simply returned.
   * @return object Promise
   *         A promise that is resolved when the full string contents
   *         are available, or rejected if something goes wrong.
   */
  getString: function(aStringGrip) {
    // Make sure this is a long string.
    if (typeof aStringGrip != "object" || aStringGrip.type != "longString") {
      return promise.resolve(aStringGrip); // Go home string, you're drunk.
    }
    // Fetch the long string only once.
    if (aStringGrip._fullText) {
      return aStringGrip._fullText.promise;
    }

    let deferred = aStringGrip._fullText = promise.defer();
    let { actor, initial, length } = aStringGrip;
    let longStringClient = this.webConsoleClient.longString(aStringGrip);

    longStringClient.substring(initial.length, length, aResponse => {
      if (aResponse.error) {
        Cu.reportError(aResponse.error + ": " + aResponse.message);
        deferred.reject(aResponse);
        return;
      }
      deferred.resolve(initial + aResponse.substring);
    });

    return deferred.promise;
  }
};

// Exports from this module
exports.NetworkEventsHandler = NetworkEventsHandler;
