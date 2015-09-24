/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");

// Firebug.SDK
const { Url } = require("reps/core/url");
const { Events } = require("reps/core/events");
const { Dom } = require("reps/core/dom");
const { createFactories } = require("reps/rep-utils");

// XHR Spy
const { NetInfoBody } = createFactories(require("./components/net-info-body.js"));
const { DataProvider } = require("./data-provider.js");

// Constants
const spies = new Map();
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

    // 'this.file' field is following HAR spec.
    // http://www.softwareishard.com/blog/har-12-spec/
    this.file = log.response;
    this.parentNode = log.node;
    this.file.request.queryString = Url.parseURLParams(this.file.request.url);

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
    this.netInfoBodyBox.parentNode.removeChild(this.netInfoBodyBox);
  },

  /**
   * Render XHR inline preview body.
   */
  renderBody: function() {
    Trace.sysout("XhrSpy.renderBody;", this.file);

    var messageBody = this.parentNode.querySelector(".message-body-wrapper");

    // Create box for all markup rendered by ReactJS. Since we are
    // rendering within webconsole.xul (i.e. XUL document) we need
    // to explicitly specify HTML namespace.
    var doc = messageBody.ownerDocument;
    this.netInfoBodyBox = doc.createElementNS(XHTML_NS, "div");
    this.netInfoBodyBox.classList.add("netInfoBody");
    messageBody.appendChild(this.netInfoBodyBox);

    this.refresh();
  },

  /**
   * Render top level ReactJS component.
   */
  refresh: function() {
    Trace.sysout("XhrSpy.refresh;", this.file);

    if (!this.netInfoBodyBox) {
      return;
    }

    var body = NetInfoBody({
      data: this.file,
      actions: this
    });

    React.render(body, this.netInfoBodyBox);
  },

  // Actions

  requestData: function(method) {
    Trace.sysout("XhrSpy.requestData; " + method, this.file);

    // Request for more data from the backend should be done only
    // if the data are already available on the backend.
    // xxxHonza: the updates are not sent sometimes.
    /*if (!this.availableUpdates.has(method)) {
      Trace.sysout("XhrSpy.requestData; Not available!");
      return;
    }*/

    DataProvider.requestData(this.file.actor, method).then(args => {
      this.onRequestData(method, args.response);
    });
  },

  onRequestData: function(method, response) {
    Trace.sysout("XhrSpy.onRequestData; " + method, response);

    var result;
    switch (method) {
      case "requestHeaders":
        result = this.onRequestHeaders(response);
        break;
      case "responseHeaders":
        result = this.onResponseHeaders(response);
        break;
      case "requestCookies":
        result = this.onRequestCookies(response);
        break;
      case "responseCookies":
        result = this.onResponseCookies(response);
        break;
      case "responseContent":
        result = this.onResponseContent(response);
        break;
      case "requestPostData":
        result = this.onRequestPostData(response);
        break;
    }

    result.then(value => {
      this.refresh();
    });
  },

  onRequestHeaders: function(response) {
    this.file.request.headers = response.headers;

    return this.resolveHeaders(this.file.request.headers);
  },

  onResponseHeaders: function(response) {
    this.file.response.headers = response.headers;

    return this.resolveHeaders(this.file.response.headers);
  },

  onResponseContent: function(response) {
    var content = response.content;

    for (var p in content) {
      this.file.response.content[p] = content[p];
    }

    // Resolve long string xxxHonza
    /*var text = response.content.text;
    if (typeof text == "object") {
      DataProvider.getLongString(text).then(value => {
        response.content.text = value;
      })
    }*/

    return Promise.resolve();
  },

  onRequestPostData: function(response) {
    this.file.request.postData = response.postData;
    return Promise.resolve();
  },

  onRequestCookies: function(response) {
    this.file.request.cookies = response.cookies;
    return this.resolveHeaders(this.file.request.cookies);
  },

  onResponseCookies: function(response) {
    this.file.response.cookies = response.cookies;
    return this.resolveHeaders(this.file.response.cookies);
  },

  resolveHeaders: function(headers) {
    var promises = [];

    for (var header of headers) {
      if (typeof header.value == "object") {
        promises.push(this.resolveString(header.value).then(value => {
          header.value = value;
        }));
      }
    }

    return Promise.all(promises);
  },

  resolveString: function(object, propName) {
    var stringGrip = object[propName];
    if (typeof stringGrip == "object") {
      DataProvider.resolveString(stringGrip).then(args => {
        object[propName] = args.response;
        this.refresh();
      });
    }
  }
};

// Exports from this module
exports.onXhrLog = onXhrLog;
});
