/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { defer, all } = require("sdk/core/promise");

function HarCollector(netMonitor) {
  this.netMonitor = netMonitor;
  this.webConsoleClient = netMonitor.webConsoleClient;
  this.client = netMonitor.client;

  this.onNetworkEvent = this.onNetworkEvent.bind(this);
  this.onNetworkEventUpdate = this.onNetworkEventUpdate.bind(this);
  this.onRequestHeaders = this.onRequestHeaders.bind(this);
  this.onRequestCookies = this.onRequestCookies.bind(this);
  this.onRequestPostData = this.onRequestPostData.bind(this);
  this.onResponseHeaders = this.onResponseHeaders.bind(this);
  this.onResponseCookies = this.onResponseCookies.bind(this);
  this.onResponseContent = this.onResponseContent.bind(this);
  this.onEventTimings = this.onEventTimings.bind(this);

  this.files = new Map();
  this.firstRequestStart = -1;
  this.promises = [];
}

/**
 * TODO: docs
 */
HarCollector.prototype = {
/** @lends HarCollector */

  // Connection

  start: function() {
    Trace.sysout("HarCollector.connect;");

    this.client.addListener("networkEvent", this.onNetworkEvent);
    this.client.addListener("networkEventUpdate", this.onNetworkEventUpdate);
  },

  stop: function() {
    if (!this.client) {
      return;
    }

    Trace.sysout("HarCollector.disconnect;");

    let deffered = defer();

    // All requests for additional data must be received to have
    // complete HTTP info to generate the result HAR file.
    all(this.promises).then(() => {
      Trace.sysout("HarCollector.disconnect; DONE");

      this.client.removeListener("networkEvent", this.onNetworkEvent);
      this.client.removeListener("networkEventUpdate", this.onNetworkEventUpdate);

      deffered.resolve(this);
    });

    return deffered.promise;
  },

  // Collected Data

  getFile: function(actorId) {
    return this.files.get(actorId);
  },

  // Event Handlers

  onNetworkEvent: function(type, packet) {
    // Skip events from different console actors.
    if (packet.from != this.webConsoleClient.actor) {
      return;
    }

    Trace.sysout("HarCollector.onNetworkEvent; " + type, packet);

    let { actor, startedDateTime, method, url, isXHR } = packet.eventActor;
    let startTime = Date.parse(startedDateTime);

    if (this.firstRequestStart == -1) {
      this.firstRequestStart = startTime;
    }

    let file = this.getFile(actor);
    if (file) {
      TraceError.sysout("HarCollector.onNetworkEvent; ERROR " +
        "existing file conflict!");
      return;
    }

    this.files.set(actor, {
      startedDeltaMillis: startTime - this.firstRequestStart,
      startedMillis: startTime,
      method: method,
      url: url,
      isXHR: isXHR
    });
  },

  onNetworkEventUpdate: function(type, packet) {
    let actor = packet.from;

    // Skip events from unknown actors (not in the list).
    // There could also be dead requests received after the target is closed.
    let file = this.getFile(packet.from);
    if (!file) {
      TraceError.sysout("HarCollector.onNetworkEventUpdate; ERROR " +
        "Unknown event actor: " + type, packet);
      return;
    }

    Trace.sysout("HarCollector.onNetworkEventUpdate; " +
      type, packet);

    let promise;
    switch (packet.updateType) {
      case "requestHeaders":
        promise = this.getData(actor, "getRequestHeaders", this.onRequestHeaders);
        break;
      case "requestCookies":
        promise = this.getData(actor, "getRequestCookies", this.onRequestCookies);
        break;
      case "requestPostData":
        promise = this.getData(actor, "getRequestPostData", this.onRequestPostData);
        break;
      case "responseHeaders":
        promise = this.getData(actor, "getResponseHeaders", this.onResponseHeaders);
        break;
      case "responseCookies":
        promise = this.getData(actor, "getResponseCookies", this.onResponseCookies);
        break;
      case "responseStart":
        break;
      case "responseContent":
        promise = this.getData(actor, "getResponseContent", this.onResponseContent);
        break;
      case "eventTimings":
        promise = this.getData(actor, "getEventTimings", this.onEventTimings);
        break;
    }

    if (promise) {
      this.promises.push(promise);
    }
  },

  getData: function(actor, method, callback) {
    let deferred = defer();

    if (!this.webConsoleClient[method]) {
      TraceError.sysout("HarCollector.getData; ERROR " +
        "Unknown method!");
      return;
    }

    this.webConsoleClient[method](actor, response => {
      callback(response);
      deferred.resolve(response);
    });

    return deferred.promise;
  },

  /**
   * Handles additional information received for a "requestHeaders" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestHeaders: function(response) {
    Trace.sysout("HarCollector.onRequestHeaders;", response);

    let file = this.getFile(response.from);
    file.requestHeaders = response.requestHeaders;
    file.headersSize = response.headersSize;
  },

  /**
   * Handles additional information received for a "requestCookies" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestCookies: function(response) {
    Trace.sysout("HarCollector.onRequestCookies;", response);

    let file = this.getFile(response.from);
    file.requestCookies = response;
  },

  /**
   * Handles additional information received for a "requestPostData" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestPostData: function(response) {
    Trace.sysout("HarCollector.onRequestPostData;", response);

    let file = this.getFile(response.from);
    file.requestPostData = response;
  },

  /**
   * Handles additional information received for a "responseHeaders" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseHeaders: function(response) {
    Trace.sysout("HarCollector.onResponseHeaders;", response);

    let file = this.getFile(response.from);
    file.responseHeaders = response.responseHeaders;
    file.headersSize = response.headersSize;
  },

  /**
   * Handles additional information received for a "responseCookies" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseCookies: function(response) {
    Trace.sysout("HarCollector.onResponseCookies;", response);

    let file = this.getFile(response.from);
    file.responseCookies = response;
  },

  /**
   * Handles additional information received for a "responseContent" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseContent: function(response) {
    Trace.sysout("HarCollector.onResponseContent;", response);

    let file = this.getFile(response.from);
    file.mimeType = "text/plain";
    file.responseContent = response;
  },

  /**
   * Handles additional information received for a "eventTimings" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onEventTimings: function(response) {
    Trace.sysout("HarCollector.onEventTimings;", response);

    let file = this.getFile(response.from);
    file.eventTimings = response;
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

    longStringClient.substring(initial.length, length, response => {
      if (response.error) {
        Cu.reportError(response.error + ": " + response.message);
        deferred.reject(response);
        return;
      }
      deferred.resolve(initial + response.substring);
    });

    return deferred.promise;
  }
};

// Exports from this module
exports.HarCollector = HarCollector;
