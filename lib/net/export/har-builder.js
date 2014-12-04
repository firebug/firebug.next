/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { Locale } = require("../../core/locale.js");

const appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const NetworkHelper = devtools["require"]("devtools/toolkit/webconsole/network-helper");

const harVersion = "1.1";
const prefDomain = "extensions.firebug.netexport";


var HarBuilder = function() {
  this.pageMap = [];
}

/**
 * This object is responsible for building HAR file. See HAR spec:
 * https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html
 */
HarBuilder.prototype =
/** @lends HarBuilder */
{
  build: function(context, items) {
    this.context = context;

    // Build basic structure for data.
    let log = this.buildLog();

    // Build entries.
    for (let i=0; i<items.length; i++) {
      let file = items[i].attachment;

      FBTrace.sysout("exporter.build; file", items[i]);

      // xxxHonza: export only loaded files?
      log.entries.push(this.buildEntry(log, file));
    }

    return { log: log };
  },

  buildLog: function() {
    var log = {};
    log.version = harVersion;
    log.creator = {name: "Firebug", version: self.version};
    log.browser = {name: appInfo.name, version: appInfo.version};
    log.pages = [];
    log.entries = [];
    return log;
  },

  buildPage: function(file) {
    let page = {};

    // Page start time is set when the first request is processed (see
    // buildEntry)
    page.startedDateTime = 0;

    page.id = "page_" + this.context.getId();
    page.title = this.context.getTitle();

    return page;
  },

  getPage: function(log, file)  {
    let id = this.context.getId();
    var page = this.pageMap[id];
    if (page) {
      return page;
    }

    Trace.sysout("exporter.getPage; " + id);

    this.pageMap[id] = page = this.buildPage(file);
    log.pages.push(page); 

    return page;
  },

  buildEntry: function(log, file) {
    let page = this.getPage(log, file);

    let entry = {};
    entry.pageref = page.id;
    entry.startedDateTime = dateToJSON(new Date(file.startedMillis));
    entry.time = file.endedMillis - file.startedMillis;

    entry.request = this.buildRequest(file);
    entry.response = this.buildResponse(file);
    //entry.cache = this.buildCache(file);
    entry.timings = file.eventTimings.timings;

    // Remote IP address and port number are accessible in Firefox 5.
    //if (file.remoteAddress)
    //    entry.serverIPAddress = file.remoteAddress;

    //if (file.remotePort)
    //    entry.connection = file.remotePort + ""; // must be a string

    // Compute page load start time according to the first request start
    // time.
    //if (!page.startedDateTime)
    //    page.startedDateTime = entry.startedDateTime;

    //page.pageTimings = this.buildPageTimings(page, file);

    return entry;
  },

  buildPageTimings: function(page, file)
  {
      var timings = page.pageTimings;

      // Put page timings into the page object when we have the first entry.
      if (!timings)
      {
          // The default value -1 (not available) according to the
          // specification.
          timings = {onContentLoad: -1, onLoad: -1};

          if (file.phase.contentLoadTime)
              timings.onContentLoad = file.phase.contentLoadTime - file.startTime;

          if (file.phase.windowLoadTime)
              timings.onLoad = file.phase.windowLoadTime - file.startTime;

          // Remember start time of the first request for time stamps below.
          // Time stamps
          // are always computed against the page start time.
          this.startedDateTime = file.startTime;
      }

      return timings;
  },

  buildRequest: function(file) {
    let request = {};

    request.method = file.method;
    request.url = file.url;
    request.httpVersion = file.httpVersion;

    request.cookies = file.requestCookies;
    request.headers = file.requestHeaders.headers;

    request.queryString = parseQueryString(nsIURL(file.url).query);
    request.postData = "";// file.requestPostData.postData;

    request.headersSize = file.requestHeaders.headersSize;
    request.bodySize = -1;//file.contentSize;

    return request;
  },

  buildResponse: function(file)
  {
    let response = {
      status: 0
    };

    // Arbitrary value if it's aborted to make sure status has a number
    if (file.responseStatus) {
      response.status = parseInt(file.responseStatus);
    }

    response.statusText = file.responseStatusText;
    response.httpVersion = file.httpVersion;

    response.cookies = file.responseCookies;
    response.headers = file.responseHeaders ? file.responseHeaders.headers : {};
    response.content = this.buildContent(file);

    response.redirectURL = findHeader(file.responseHeaders, "Location");

    response.headersSize = file.responseHeadersText ? file.responseHeadersText.length : -1;
    response.bodySize = file.size;

    return response;
  },

  buildContent: function(file)
  {
    let content = {
      mimeType: ""
    };

    content.size = file.contentSize;
    content.mimeType = file.mimeType;

    let includeResponseBodies = Options.getPref(prefDomain + "includeResponseBodies");
    if (includeResponseBodies) {
      content.text = file.responseContent.content;
    }

    if (!includeResponseBodies) {
      content.comment = Locale.$STR("netexport.responseBodyNotIncluded");
    }

    return content;
  },

  buildCache: function(file)
  {
      var cache = {};

      if (!file.fromCache)
          return cache;

      // cache.beforeRequest = {}; //xxxHonza: There is no such info yet in
      // the Net panel.

      if (file.cacheEntry)
          cache.afterRequest = this.buildCacheEntry(file.cacheEntry);
      else
          cache.afterRequest = null;

      return cache;
  },

  buildCacheEntry: function(cacheEntry)
  {
      var cache = {};
      cache.expires = findHeader(cacheEntry, "Expires");
      cache.lastAccess = findHeader(cacheEntry, "Last Fetched");
      cache.eTag = ""; // xxxHonza
      cache.hitCount = findHeader(cacheEntry, "Fetch Count");
      return cache;
  },

  // xxxHonza: duplicated in NetUtils
  getBlockingEndTime: function(file)
  {
      if (file.resolveStarted && file.connectStarted)
          return file.resolvingTime;

      if (file.connectStarted)
          return file.connectingTime;

      if (file.sendStarted)
          return file.sendingTime;

      // This is how blocking end was computed before Firebug 1.8b6
      return (file.sendingTime > file.startTime) ? file.sendingTime : file.waitingForTime;
  },
}

// *********************************************************************************************
// //
// Helpers

// xxxHonza: duplicated in net.js
function isURLEncodedFile(file, text)
{
    if (text && text.toLowerCase().indexOf("content-type: application/x-www-form-urlencoded") != -1)
      return true;

  // The header value doesn't have to be always exactly
  // "application/x-www-form-urlencoded",
  // there can be even charset specified. So, use indexOf rather than just
  // "==".
  var headerValue = findHeader(file.requestHeaders, "content-type");
  if (headerValue && headerValue.indexOf("application/x-www-form-urlencoded") == 0)
        return true;

    return false;
}

function findHeader(headers, name)
{
    name = name.toLowerCase();
    for (var i = 0; headers && i < headers.length; ++i)
    {
        if (headers[i].name.toLowerCase() == name)
            return headers[i].value;
    }

    return "";
}

function safeGetName(request)
{
    try
    {
        return request.name;
    }
    catch (exc) { }

    return null;
}

function dateToJSON(date)
{
    function f(n, c) {
        if (!c) c = 2;
        var s = new String(n);
        while (s.length < c) s = "0" + s;
      return s;
  }

  var result = date.getFullYear() + '-' +
      f(date.getMonth() + 1) + '-' +
      f(date.getDate()) + 'T' +
      f(date.getHours()) + ':' +
      f(date.getMinutes()) + ':' +
      f(date.getSeconds()) + '.' +
      f(date.getMilliseconds(), 3);

  var offset = date.getTimezoneOffset();
  var positive = offset > 0;

  // Convert to positive number before using Math.floor (see issue 5512)
  offset = Math.abs(offset);
  var offsetHours = Math.floor(offset / 60);
  var offsetMinutes = Math.floor(offset % 60);
  var prettyOffset = (positive > 0 ? "-" : "+") + f(offsetHours) + ":" + f(offsetMinutes);

    return result + prettyOffset;
}

function parseQueryString(aQueryString) {
  // Make sure there's at least one param available.
  // Be careful here, params don't necessarily need to have values, so
  // no need to verify the existence of a "=".
  if (!aQueryString) {
    return;
  }
  // Turn the params string into an array containing { name: value } tuples.
  let paramsArray = aQueryString.replace(/^[?&]/, "").split("&").map(e =>
    let (param = e.split("=")) {
      name: param[0] ? NetworkHelper.convertToUnicode(unescape(param[0])) : "",
      value: param[1] ? NetworkHelper.convertToUnicode(unescape(param[1])) : ""
    });
  return paramsArray;
}

function nsIURL(aUrl, aStore = nsIURL.store) {
  if (aStore.has(aUrl)) {
    return aStore.get(aUrl);
  }

  let uri = Services.io.newURI(aUrl, null, null).QueryInterface(Ci.nsIURL);
  aStore.set(aUrl, uri);

  return uri;
}
nsIURL.store = new Map();

// Exports from this module
exports.HarBuilder = HarBuilder;

