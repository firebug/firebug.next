/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { defer, all } = require("sdk/core/promise");
const { setTimeout, clearTimeout } = require("sdk/timers");
const { Options } = require("../../core/options.js");

// Devtools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

/**
 * TODO: docs
 */
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

  this.onPageLoadTimeout = this.onPageLoadTimeout.bind(this);

  this.clear();
}

HarCollector.prototype = {
/** @lends HarCollector */

  // Connection

  start: function() {
    Trace.sysout("HarCollector.start;");

    this.client.addListener("networkEvent", this.onNetworkEvent);
    this.client.addListener("networkEventUpdate", this.onNetworkEventUpdate);
  },

  stop: function() {
    Trace.sysout("HarCollector.stop;");

    this.client.removeListener("networkEvent", this.onNetworkEvent);
    this.client.removeListener("networkEventUpdate", this.onNetworkEventUpdate);
  },

  clear: function() {
    // xxxHonza: any pending requests events will be ignored (they
    // turn into zombies, since not present in the files array).
    this.files = new Map();
    this.items = [];
    this.firstRequestStart = -1;
    this.lastRequestStart = -1;
    this.requests = [];
  },

  waitForPageLoad: function() {
    // xxxHonza: but, if the page never finishes loading there is
    // yet another timeout 'netexport.timeout' that should ensure
    // export of the data collected so far TODO FIXME
    let deffered = defer();
    this.waitForResponses().then(() => {
      Trace.sysout("HarCollector.waitForPageLoad; DONE Page loaded!");
      deffered.resolve(this);
    });

    return deffered.promise;
  },

  waitForResponses: function() {
    Trace.sysout("HarCollector.waitForResponses; " + this.requests.length);

    // All requests for additional data must be received to have complete
    // HTTP info to generate the result HAR file. So, wait for all current
    // promises. Note that new promises (requests) can be generated during the
    // process of HTTP data collection.
    return waitForAll(this.requests).then(() => {
      // All responses are received from the backend now. We yet need to
      // wait for a little while to see if a new request appears. If yes,
      // lets's start gathering HTTP data again. If no, we can declare
      // the page loaded.
      // If some new requests appears in the meantime the promise will
      // be rejected and we need to wait for responses all over again.
      return this.waitForTimeout().then(() => {
        // Page loaded!
      }, () => {
        Trace.sysout("HarCollector.waitForResponses; NEW requests " +
          "appeared during page timeout!");

        // New requests executed, let's wait again.
        return this.waitForResponses();
      })
    });
  },

  // Page Loaded Timeout

  /**
   * The page is loaded when there are no new requests within given period
   * of time. The time is set in preferences: 'netexport.pageLoadedTimeout'
   */
  waitForTimeout: function() {
    // xxxHonza: TODO
    // The auto-export is not done if the timeout is set to zero (or less).
    // This is useful in cases where the export is done manually through
    // API exposed to the content.
    let timeout = Options.get("netexport.pageLoadedTimeout");

    Trace.sysout("HarCollector.waitForTimeout; " + timeout);

    this.pageLoadDeferred = defer();

    if (timeout <= 0) {
      this.pageLoadDeferred.resolve();
      return this.pageLoadDeferred.promise;
    }

    this.pageLoadTimeout = setTimeout(this.onPageLoadTimeout, timeout);

    return this.pageLoadDeferred.promise;
  },

  onPageLoadTimeout: function() {
    Trace.sysout("HarCollector.onPageLoadTimeout;");

    // Ha, page has been loaded. Resolve the final timeout promise.
    this.pageLoadDeferred.resolve();
  },

  resetPageLoadTimeout: function() {
    // Remove the current timeout.
    if (this.pageLoadTimeout) {
      Trace.sysout("HarCollector.resetPageLoadTimeout;");

      clearTimeout(this.pageLoadTimeout);
      this.pageLoadTimeout = null;
    }

    // Reject the current page load promise
    if (this.pageLoadDeferred) {
      this.pageLoadDeferred.reject();
      this.pageLoadDeferred = null;
    }
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

    if (this.lastRequestEnd < startTime) {
      this.lastRequestEnd = startTime;
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

    // Ah, and if the page was already waiting to finish and this
    // new request happened within the a timeout than of course,
    // reset the timeout and wait for all responses as usual.

    // xxxHonza: There is no promise to wait for now. It's created
    // in onNetworkEventUpdate.
    //this.resetPageLoadTimeout();
  },

  onNetworkEventUpdate: function(type, packet) {
    let actor = packet.from;

    // Skip events from unknown actors (not in the list).
    // There could also be zombie requests received after the target is closed.
    let file = this.getFile(packet.from);
    if (!file) {
      TraceError.sysout("HarCollector.onNetworkEventUpdate; ERROR " +
        "Unknown event actor: " + type, packet);
      return;
    }

    Trace.sysout("HarCollector.onNetworkEventUpdate; " +
      packet.updateType, packet);

    let includeResponseBodies = Options.get("netexport.includeResponseBodies");

    let request;
    switch (packet.updateType) {
      case "requestHeaders":
        request = this.getData(actor, "getRequestHeaders", this.onRequestHeaders);
        break;
      case "requestCookies":
        request = this.getData(actor, "getRequestCookies", this.onRequestCookies);
        break;
      case "requestPostData":
        request = this.getData(actor, "getRequestPostData", this.onRequestPostData);
        break;
      case "responseHeaders":
        request = this.getData(actor, "getResponseHeaders", this.onResponseHeaders);
        break;
      case "responseCookies":
        request = this.getData(actor, "getResponseCookies", this.onResponseCookies);
        break;
      case "responseStart":
        file.httpVersion = packet.response.httpVersion;
        file.status = packet.response.status;
        file.statusText = packet.response.statusText;
        break;
      case "responseContent":
        file.contentSize = packet.contentSize;
        file.mimeType = packet.mimeType;
        file.transferredSize = packet.transferredSize;

        if (includeResponseBodies) {
          request = this.getData(actor, "getResponseContent", this.onResponseContent);
        }
        break;
      case "eventTimings":
        request = this.getData(actor, "getEventTimings", this.onEventTimings);
        break;
    }

    if (request) {
      this.requests.push(request);
    }

    this.resetPageLoadTimeout();
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
    file.requestHeaders = response;

    this.getLongHeaders(response.headers);
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

    this.getLongHeaders(response.cookies);
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

    // Resolve long string
    let text = response.postData.text;
    if (typeof text == "object") {
      this.getString(text).then(value => {
          response.postData.text = value;
      })
    }
  },

  /**
   * Handles additional information received for a "responseHeaders" packet.
   *
   * @param object response
   *        The message received from the server.
   */
  onResponseHeaders: function(response) {
    let file = this.getFile(response.from);
    file.responseHeaders = response;

    this.getLongHeaders(response.headers);
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

    this.getLongHeaders(response.cookies);
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

    // Resolve long string
    let text = response.content.text;
    if (typeof text == "object") {
      this.getString(text).then(value => {
        response.content.text = value;
      })
    }
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

    let totalTime = response.totalTime;
    file.totalTime = totalTime;
    file.endedMillis = file.startedMillis + totalTime;
  },

  // Helpers

  getLongHeaders: makeInfallible(function(headers) {
    for (let header of headers) {
      if (typeof header.value == "object") {
        this.getString(header.value).then(value => {
          header.value = value;
        });
      }
    }
  }),

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
  getString: function(stringGrip) {
    let promise = Rdp.getLongString(stringGrip, this.webConsoleClient);
    this.requests.push(promise);
    return promise;
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
