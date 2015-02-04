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
const { Options } = require("../../core/options.js");
const { emit } = require("sdk/event/core");
const { defer } = require("sdk/core/promise");

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
  Trace.sysout("xhr-spy.logXhr;", log);

  let context = consoleOverlay.getContext();

  // Create registry of spies (map: netEvent actor id -> XhrSpy object)
  if (!context.spies) {
    context.spies = new Map();
  }

  let response = log.response;
  let spy = context.spies.get(response.actor);
  if (!spy && response.isXHR) {
    spy = new XhrSpy(consoleOverlay, log);
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

  update: function() {
    
  },

  // Backend Data Accessors

  getResponseContent: function() {
    if (this.contentDeferred) {
      return this.contentDeferred.promise;
    }

    this.contentDeferred = defer();

    if (this.content) {
      this.contentDeferred.resolve(this.content);
    } else {
      let client = this.consoleOverlay.getConsoleClient();
      client.getResponseContent(this.actorId, response => {
        this.content = response.content;
        this.contentDeferred.resolve(this.content);
      });
    }

    return this.contentDeferred.promise;
  },
});

// Exports from this module
exports.logXhr = logXhr;
