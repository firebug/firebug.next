/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");

const appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

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

    //entry.request = this.buildRequest(file);
    //entry.response = this.buildResponse(file);
    //entry.cache = this.buildCache(file);
    //entry.timings = this.buildTimings(file);

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

      var phase = file.phase;

      // Compatibility with older versions of Firebug (no time stamp).
      if (!phase.timeStamps)
          return timings;

      if (!this.phases)
          this.phases = [];

      // Check whether time-stamps from this phase has been already exported.
      if (this.phases.indexOf(phase) != -1)
          return timings;

      // Timings produced by console.timeStamp. This can be part of other
      // phases too.
      var stamps = [];
      for (var i=0; i<phase.timeStamps.length; i++)
      {
          var stamp = phase.timeStamps[i];
          if (!stamp.time)
              continue;

          // Ignore standard timings, they are already exported.
          var label = stamp.label;
          if (label == "load" || label == "DOMContentLoaded")
              continue;

          // Time stamps from all phases are inserted into one list (HAR
          // doesn't know about
          // phases). It's up to the client how to deal with it.
          // xxxHonza: This field is non standard so far.
          if (!timings._timeStamps)
          {
              timings.comment = "_timeStamps field contains timing data generated using " +
                  "console.timeStamp() method. See Firebug documentation: " +
                  "http://getfirebug.com/wiki/index.php/Console_API";
              timings._timeStamps = [];
          }

          timings._timeStamps.push({
              time: stamp.time - this.startedDateTime,
              label: label
          });
      }

      // Time stamps from this phase has been exported.
      this.phases.push(phase);

      return timings;
  },

  buildRequest: function(file)
  {
      var request = {};

      request.method = file.method;
      request.url = file.request.URI.spec;
      request.httpVersion = this.getHttpVersion(file.request, true);

      request.cookies = this.buildRequestCookies(file);
      request.headers = this.buildHeaders(file.requestHeaders);

      request.queryString = file.urlParams;
      request.postData = this.buildPostData(file);

      request.headersSize = file.requestHeadersText ? file.requestHeadersText.length : -1;
      request.bodySize = file.postText ? file.postText.length : -1;

      return request;
  },

  buildPostData: function(file)
  {
      if (!file.postText)
          return;

      var postData = {mimeType: "", params: [], text: ""};

      var text = file.postText;
      if (isURLEncodedFile(file, text))
      {
          var lines = text.split("\n");
          postData.mimeType = "application/x-www-form-urlencoded";
          postData.params = parseURLEncodedText(lines[lines.length-1]);
      }
      else
      {
          postData.text = text;
      }

      if (FBTrace.DBG_NETEXPORT)
          FBTrace.sysout("netexport.buildPostData; ", postData);

      return postData;
  },

  buildRequestCookies: function(file)
  {
      var header = findHeader(file.requestHeaders, "cookie");

      var result = [];
      var cookies = header ? header.split("; ") : [];
      for (var i=0; i<cookies.length; i++)
      {
          var data = cookies[i];
          var index = data.indexOf("=");
          var cookie = {};
          cookie.name = data.substr(0, index);
          cookie.value = data.substr(index+1);
          result.push(cookie);
      }

      return result;
  },

  buildResponseCookies: function(file)
  {
      var header = findHeader(file.responseHeaders, "set-cookie");

      var result = [];
      var cookies = header ? header.split("\n") : [];
      for (var i=0; i<cookies.length; i++)
      {
          var cookie = this.parseCookieFromResponse(cookies[i]);
          if (!cookie.domain) 
              cookie.domain = file.request.URI.host;
          result.push(cookie);
      }

      return result;
  },

  parseCookieFromResponse: function(string)
  {
      var cookie = new Object();
      var pairs = string.split(";");

      for (var i=0; i<pairs.length; i++)
      {
          var pair = FBL.trim(pairs[i]);
          var option = pair.split("=");
          if (i == 0)
          {
              cookie.name = option[0];
              cookie.value = option[1];
          } 
          else
          {
              var name = option[0].toLowerCase();
              if (name == "httponly")
              {
                  cookie.httpOnly = true;
              }
              else if (name == "expires")
              {
                  var value = option[1];
                  value = value.replace(/-/g, " ");
                  cookie[name] = dateToJSON(new Date(value.replace(/-/g, " ")));
              }
              else if (name == "secure")
              {
                  cookie.secure = true;
              }
              else
              {
                  cookie[name] = option[1];
              }
          }
      }
      
      return cookie;
  },

  buildHeaders: function(headers)
  {
      var result = [];
      for (var i=0; headers && i<headers.length; i++)
          result.push({name: headers[i].name, value: headers[i].value});
      return result;
  },

  buildResponse: function(file)
  {
      var response = {status: 0};

      // Arbitrary value if it's aborted to make sure status has a number
      if (file.responseStatus)
          response.status = parseInt(file.responseStatus);

      response.statusText = file.responseStatusText;
      response.httpVersion = this.getHttpVersion(file.request, false);

      response.cookies = this.buildResponseCookies(file);
      response.headers = this.buildHeaders(file.responseHeaders);
      response.content = this.buildContent(file);

      response.redirectURL = findHeader(file.responseHeaders, "Location");

      response.headersSize = file.responseHeadersText ? file.responseHeadersText.length : -1;
      response.bodySize = file.size;

      return response;
  },

  buildContent: function(file)
  {
      var content = {mimeType: ""};

      var responseText = (typeof(file.responseText) != "undefined") ?
          file.responseText : this.context.sourceCache.loadText(file.href, file.method, file);

      content.size = responseText ? responseText.length : (file.size >= 0 ? file.size : 0);

      try
      {
          content.mimeType = file.request.contentType;
      }
      catch (e)
      {
          if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
              FBTrace.sysout("netexport.buildContent EXCEPTION", e);
      }

      var includeResponseBodies = Firebug.getPref(prefDomain, "includeResponseBodies");
      if (responseText && includeResponseBodies)
          content.text = responseText;

      if (!includeResponseBodies)
          content.comment = $STR("netexport.export.responseBodyNotIncluded");

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

  buildTimings: function(file)
  {
      var startTime = file.startTime;
      var resolvingTime = file.resolvingTime;
      var connectingTime = file.connectingTime;
      var connectedTime = file.connectedTime;
      var sendingTime = file.sendingTime;
      var waitingForTime = file.waitingForTime;
      var respondedTime = file.respondedTime;
      var endTime = file.endTime;

      // Fix problem where some net events wasn't sent and some timing info
      // wasn't updated to the last received event.
      // This problem should be fixed in Firebug 1.8b5
      if (connectingTime < resolvingTime)
          connectingTime = resolvingTime;

      if (connectedTime < connectingTime)
          connectedTime = connectingTime;

      if (sendingTime < connectedTime)
          sendingTime = connectedTime;

      if (waitingForTime < sendingTime)
          waitingForTime = sendingTime;

      var blockingEnd = this.getBlockingEndTime(file);

      var timings = {};
      timings.blocked = blockingEnd - startTime;
      timings.dns = connectingTime - resolvingTime;
      timings.connect = file.connectStarted ? sendingTime - connectingTime : 0;
      timings.send = waitingForTime - sendingTime;
      timings.wait = respondedTime - waitingForTime;
      timings.receive = endTime - respondedTime;

      return timings;
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

  getHttpVersion: function(request, forRequest)
  {
      if (request instanceof Ci.nsIHttpChannelInternal)
      {
          try
          {
              var major = {}, minor = {};

              if (forRequest)
                  request.getRequestVersion(major, minor);
              else
                  request.getResponseVersion(major, minor);

              return "HTTP/" + major.value + "." + minor.value;
          }
          catch(err)
          {
              if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                  FBTrace.sysout("netexport.getHttpVersion EXCEPTION", err);
          }
      }

      return "";
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

// Exports from this module
exports.HarBuilder = HarBuilder;

