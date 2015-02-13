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
  this.items = [];
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
    Trace.sysout("HarCollector.start;");

    this.client.addListener("networkEvent", this.onNetworkEvent);
    this.client.addListener("networkEventUpdate", this.onNetworkEventUpdate);
  },

  stop: function() {
    if (!this.client) {
      return;
    }

    Trace.sysout("HarCollector.stop;");

    let deffered = defer();

    // All requests for additional data must be received to have complete
    // HTTP info to generate the result HAR file. So, wait for all current
    // promises. Note that new promises (requests) can be generated during the
    // process of HTTP data collection.
    waitForAll(this.promises).then(() => {
      Trace.sysout("HarCollector.stop; DONE");

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

  getItems: function() {
    return this.items;
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

    file = {
      startedDeltaMillis: startTime - this.firstRequestStart,
      startedMillis: startTime,
      method: method,
      url: url,
      isXHR: isXHR
    };

    this.files.set(actor, file);

    // Mimic the Net panel data structure
    this.items.push({
      attachment: file
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
      packet.updateType, packet);

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

    let file = this.getFile(actor);

    Trace.sysout("HarCollector.getData; REQUEST " + method +
      ", " + file.url, file);

    this.webConsoleClient[method](actor, response => {
      Trace.sysout("HarCollector.getData; RESPONSE " + method +
        ", " + file.url, response);

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
    let file = this.getFile(response.from);
    file.requestHeaders = response.headers;
    file.headersSize = response.headersSize;
  },

  /**
   * Handles additional information received for a "requestCookies" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onRequestCookies: function(response) {
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
    let file = this.getFile(response.from);
    file.responseHeaders = response.headers;
    file.headersSize = response.headersSize;
  },

  /**
   * Handles additional information received for a "responseCookies" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseCookies: function(response) {
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

// Helpers

/**
 * Helper function that allows to wait for array of promises. It is
 * possible to dynamically add new promises in the provided array.
 * The function will wait even for the newly added promises.
 * (this isn't possible with the default Promise.all);
 */
function waitForAll(promises) {
  Trace.sysout("HarCollector.waitForAll; " + promises.length);

  // Remove all from the original array and get clone of it.
  let clone = promises.splice(0, promises.length);

  // Wait for all promises in the given array.
  return all(clone).then(() => {
    // If there are new promises (in the original array)
    // to wait for - chain them!
    if (promises.length) {
      return waitForAll(promises);
    }
  });
}

// Exports from this module
exports.HarCollector = HarCollector;
