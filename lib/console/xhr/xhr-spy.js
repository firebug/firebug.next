/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Locale } = require("../../core/locale.js");
const { Str } = require("../../core/string.js");
const { Class } = require("sdk/core/heritage");
const { Events } = require("../../core/events.js");
const { Css } = require("../../core/css.js");
const { Dom } = require("../../core/dom.js");
const { Url } = require("../../core/url.js");
const { Rdp } = require("../../core/rdp.js");
const { Options } = require("../../core/options.js");
const { emit } = require("sdk/event/core");
const { defer, all, resolve } = require("sdk/core/promise");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const { NetInfoBody } = require("./net-info-body.js");

/**
 * TODO: docs
 *
 * @param consoleOverlay
 * @param msg
 */
function logXhr(consoleOverlay, log) {
  Trace.sysout("xhr-spy.logXhr; ", log);

  let context = consoleOverlay.getContext();

  // Create registry of spies (map: netEvent actor id -> XhrSpy object)
  if (!context.spies) {
    context.spies = new Map();
  }

  // The 'from' field is set only in case of a 'networkEventUpdate' packet.
  // The initial 'networkEvent' packet uses 'actor'.
  // Check if Spy object is already created for this event actor and
  // if there is none make sure to create one.
  let response = log.response;
  let spy = response.from ? context.spies.get(response.from) : null;
  let netEvent = typeof response.isXHR == "boolean";
  if (!spy && netEvent) {
    spy = new XhrSpy(consoleOverlay, log);
    context.spies.set(response.actor, spy);

    Trace.sysout("xhr-spy.logXhr; Spy created", spy);
  }

  if (!spy) {
    return false;
  }

  if (log.update) {
    spy.update(response);
  }

  return true;
}

/**
 * TODO: docs
 */
var XhrSpy = Class(
/** @lends XhrSpy */
{
  initialize: function(consoleOverlay, log) {
    Trace.sysout("xhrSpy.initialize; ", log);

    this.consoleOverlay = consoleOverlay;
    this.log = log;
    this.actorId = log.response.actor;
    this.parentNode = log.node;
    this.url = log.response.url;
    this.method = log.response.method;
    this.urlParams = Url.parseURLParams(this.url);

    this.promises = {};

    // Mark the log as XHR Spy class, this makes the log (among other thing)
    // expandable. If expanded, the user can see detailed information
    // about the XHR.
    this.parentNode.classList.add("xhrSpy");

    // Add an event listener to toggle the expanded state when clicked.
    // The event bubbling is canceled if the user clicks on the log
    // itself (not on the expanded body), so opening of the default
    // modal dialog is avoided.
    this.parentNode.addEventListener("click", (event) => {
      let infoBody = Dom.getAncestorByClass(event.target, "netInfoBody");
      if (infoBody) {
        return;
      }

      // Toggle body with details.
      this.onToggleBody(event);

      // Avoid the default modal dialog
      Events.cancelEvent(event);
    }, true);
  },

  onToggleBody: function(event) {
    Trace.sysout("xhrSpy.onToggleBody;", event);

    var target = event.currentTarget;
    var logRow = Dom.getAncestorByClass(target, "xhrSpy");

    if (!Events.isLeftClick(event)) {
      return;
    }

    logRow.classList.toggle("opened");

    if (logRow.classList.contains("opened")) {
      logRow.setAttribute("aria-expanded", "true");

      // Render xhr spy info body.
      if (!this.netInfoBody) {
        this.renderBody();
      }
    } else {
      logRow.setAttribute("aria-expanded", "false");

      this.netInfoBody.parentNode.removeChild(this.netInfoBody);
      this.netInfoBody = null;
    }
  },

  renderBody: makeInfallible(function() {
    let messageBody = this.parentNode.querySelector(".message-body-wrapper");
    this.netInfoBody = NetInfoBody.tag.append({object: this}, messageBody);

    // Notify listeners so additional tabs can be created.
    emit(NetInfoBody, "initTabBody", {
      netInfoBody: this.netInfoBody,
      file: this
    });

    // Select default tab.
    NetInfoBody.selectTabByName(this.netInfoBody, "Headers");
  }),

  update: makeInfallible(function(response) {
    Trace.sysout("xhrSpy.update; " + response.updateType, response);

    switch (response.updateType) {
    case "responseContent":
      this.discardResponseBody = response.discardResponseBody;
      break;
    }
  }),

  // Backend Data Accessors

  requestData: makeInfallible(function(type) {
    let promise = this.promises[type];
    if (promise) {
      return promise;
    }

    let deferred = defer();
    let client = this.consoleOverlay.getConsoleClient();
    client[type](this.actorId, response => {
      deferred.resolve(response);
    });

    return this.promises[type] = deferred.promise;
  }),

  getResponseContent: function() {
    return this.requestData("getResponseContent").then(response => {
      this.content = response.content;
      return this.getLongString(this.content.text).then(value => {
        return this.content.text = value;
      });
    });
  },

  getLongString: function(stringGrip) {
    let client = this.consoleOverlay.getConsoleClient();
    return Rdp.getLongString(stringGrip, client);
  }
});

// Exports from this module
exports.logXhr = logXhr;
