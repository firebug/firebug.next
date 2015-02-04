/* See license.txt for terms of usage */

"use strict";

// xxxHonza TODO:
// 1. split into more files?
// 2. Properly format the code

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

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const { Domplate } = require("../../core/domplate.js");
const { domplate, TABLE, TBODY, TR, TD, DIV, SPAN, FOR, TAG, IFRAME, A, CODE, PRE } = Domplate;
const { Rep } = require("../../reps/rep.js");
const { Reps } = require("../../reps/reps.js");
const { NetInfoBody } = require("./net-info-body.js");
const { NetInfoHeaders } = require("./net-info-headers.js");

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

    // XHR Spy class
    this.parentNode.classList.add("xhrSpy");

    this.parentNode.addEventListener("click", (event) => {
      this.onToggleBody(event);
    });
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

    // Select default tab.
    NetInfoBody.selectTabByName(this.netInfoBody, "Headers");
  }),

  update: function() {
    
  }
});

// Exports from this module
exports.logXhr = logXhr;
