/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");

// Firebug.SDK
const { Url } = require("reps/core/url");
const { Events } = require("reps/core/events");
const { Dom } = require("reps/core/dom");
const { createFactories } = require("reps/rep-utils");

// XHR Spy
const { XhrStore } = require("./xhr-store.js");
const { XhrBody } = createFactories(require("./xhr-body.js"));

// Constants
const spies = XhrStore.spies;
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * This function handles network events sent to the Console panel.
 */
function onXhrLog(log) {
  // The 'from' field is set only in case of a 'networkEventUpdate' packet.
  // The initial 'networkEvent' packet uses 'actor'.
  // Check if Spy object is already created for this event actor and
  // if there is none make sure to create one.
  var response = log.response;
  var spy = response.from ? spies.get(response.from) : null;
  var netEvent = typeof response.isXHR == "boolean";
  if (!spy && netEvent) {
    spy = new XhrSpy(log);
    spies.set(response.actor, spy);
  }

  if (!spy) {
    return false;
  }

  if (log.update) {
    spy.updateBody(response);
  }

  return true;
}

/**
 * This object represents XHR log in the Console panel. It's associated
 * with an existing log and so, also with an existing element in the DOM.
 *
 * The object neither render no request for more data by default. It only
 * reqisters a click listener to the associated log entry (a network event)
 * and changes the class attribute of the log entry, so a twisty icon
 * appears to indicates that there are more details displayed if the
 * log entry is expanded.
 *
 * When the user expands the log, data are requested from the backend
 * and rendered directly within the Console iframe.
 */
function XhrSpy(log) {
  this.initialize(log);
}

XhrSpy.prototype =
/** @lends XhrSpy */
{
  initialize: function(log) {
    Trace.sysout("XhrSpy.initialize; " + log.response.actor, log);

    // 'this.log' field is following HAR spec.
    // http://www.softwareishard.com/blog/har-12-spec/
    this.log = log.response;
    this.parentNode = log.node;
    this.log.request.queryString = Url.parseURLParams(this.log.request.url);

    // Initialize available updates set. Some data are available
    // immediately and don't have specific update event.
    this.availableUpdates = new Set();
    this.availableUpdates.add("requestHeaders");
    this.availableUpdates.add("requestPostData");

    // Mark the log as XHR Spy class, this makes the log (among other thing)
    // expandable. If expanded, the user can see detailed information
    // about the XHR.
    this.parentNode.classList.add("xhrSpy");

    // Register a click listener.
    this.addClickListener();
  },

  addClickListener: function() {
    // Add an event listener to toggle the expanded state when clicked.
    // The event bubbling is canceled if the user clicks on the log
    // itself (not on the expanded body), so opening of the default
    // modal dialog is avoided.
    this.parentNode.addEventListener("click", (event) => {
      var infoBody = Dom.getAncestorByClass(event.target, "netInfoBody");
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
    if (!Events.isLeftClick(event)) {
      return;
    }

    var originalTarget = event.originalTarget;
    if (!originalTarget.classList.contains("message-body-wrapper")) {
      return;
    }

    Trace.sysout("XhrSpy.onToggleBody;", event);

    var target = event.currentTarget;
    var logRow = Dom.getAncestorByClass(target, "xhrSpy");
    logRow.classList.toggle("opened");

    var isOpen = logRow.classList.contains("opened");
    if (isOpen) {
      logRow.setAttribute("aria-expanded", "true");
      this.renderBody();
    } else {
      logRow.setAttribute("aria-expanded", "false");
      this.closeBody();
    }
  },

  updateBody: function(response) {
    Trace.sysout("XhrSpy.updateBody; " + response.updateType, response);

    this.availableUpdates.add(response.updateType);
    this.refresh();
  },

  /**
   * Close XHR inline preview body.
   */
  closeBody: function() {
    this.xhrBodyBox.parentNode.removeChild(this.xhrBodyBox);
  },

  /**
   * Render XHR inline preview body.
   */
  renderBody: function() {
    Trace.sysout("XhrSpy.renderBody;", this.log);

    var messageBody = this.parentNode.querySelector(".message-body-wrapper");

    // Create box for all markup rendered by ReactJS. Since we are
    // rendering within webconsole.xul (i.e. XUL document) we need
    // to explicitly specify HTML namespace.
    var doc = messageBody.ownerDocument;
    this.xhrBodyBox = doc.createElementNS(XHTML_NS, "div");
    this.xhrBodyBox.classList.add("netInfoBody");
    messageBody.appendChild(this.xhrBodyBox);

    this.refresh();
  },

  /**
   * Render top level ReactJS component.
   */
  refresh: function() {
    Trace.sysout("XhrSpy.refresh;", this.log);

    if (!this.xhrBodyBox) {
      return;
    }

    var body = XhrBody({
      data: this.log,
      actions: this
    });

    React.render(body, this.xhrBodyBox);
  },

  // Actions

  requestData: function(method) {
    // Request for more data from the backend should be done only
    // if the data are already available on the backend.
    if (this.availableUpdates.has(method)) {
      XhrStore.requestData(this.log.actor, method);
    }
  },

  getLongString: function(stringGrip) {
    XhrStore.getLongString(stringGrip);
  },

  resolveLongString: function(object, propName) {
    var stringGrip = object[propName];
    if (typeof stringGrip == "object") {
      XhrStore.getLongString(stringGrip).then(response => {
        object[propName] = response;
      });
    }
  }
};

// Exports from this module
exports.onXhrLog = onXhrLog;
});
