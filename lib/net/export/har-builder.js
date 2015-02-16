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

// xxxHonza: support for 1.2 needed TODO FIXME
const harVersion = "1.1";

var HarBuilder = function() {
  this.pageMap = [];
}

/**
 * This object is responsible for building HAR file. See HAR spec:
 * https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html
 * http://www.softwareishard.com/blog/har-12-spec/
 */
HarBuilder.prototype =
/** @lends HarBuilder */
{
  build: function(context, items) {
    Trace.sysout("HarBuilder.build;", items);

    this.context = context;

    // Build basic structure for data.
    let log = this.buildLog();

    // Build entries.
    for (let i=0; i<items.length; i++) {
      let file = items[i].attachment;

      // xxxHonza: export only loaded files?
      log.entries.push(this.buildEntry(log, file));
    }

    return { log: log };
  },

  buildLog: function() {
    let log = {};
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
    let page = this.pageMap[id];
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
    entry.cache = this.buildCache(file);
    entry.timings = file.eventTimings ? file.eventTimings.timings : {};

    // Remote IP address and port number are accessible in Firefox 5.
    //if (file.remoteAddress)
    //    entry.serverIPAddress = file.remoteAddress;

    //if (file.remotePort)
    //    entry.connection = file.remotePort + ""; // must be a string

    // Compute page load start time according to the first request start
    // time.
    if (!page.startedDateTime) {
      page.startedDateTime = entry.startedDateTime;
      page.pageTimings = this.buildPageTimings(page, file);
    }

    return entry;
  },

  buildPageTimings: function(page, file) {
    // The default value -1 (not available) according to the specification.
    // xxxHonza: fix me
    let timings = {
      onContentLoad: -1,
      onLoad: -1
    };

    return timings;
  },

  buildRequest: function(file) {
    let request = {};

    request.method = file.method;
    request.url = file.url;
    request.httpVersion = file.httpVersion;

    request.cookies = file.requestCookies.cookies || [];
    request.headers = file.requestHeaders.headers;

    request.queryString = parseQueryString(nsIURL(file.url).query);
    request.postData = this.buildPostData(file);

    request.headersSize = file.requestHeaders.headersSize;
    request.bodySize = request.postData.text.length;

    return request;
  },

  buildPostData: function(file) {
    let postData = {
      mimeType: "",
      params: [],
      text: ""
    };

    if (!file.requestPostData) {
      return postData;
    }

    return file.requestPostData.postData;
  },

  buildResponse: function(file) {
    let response = {
      status: 0
    };

    // Arbitrary value if it's aborted to make sure status has a number
    if (file.status) {
      response.status = parseInt(file.status);
    }

    response.statusText = file.statusText || "";
    response.httpVersion = file.httpVersion;

    response.cookies = file.responseCookies ? file.responseCookies.cookies || {} : {};
    response.headers = file.responseHeaders ? file.responseHeaders.headers : [];
    response.content = this.buildContent(file);

    response.redirectURL = findHeader(file.responseHeaders, "Location");

    response.headersSize = file.responseHeaders.headersSize;
    response.bodySize = file.transferredSize || -1;

    return response;
  },

  buildContent: function(file) {
    let content = {
      mimeType: file.mimeType,
      size: -1
    };
    if (file.responseContent && file.responseContent.content) {
      content.size = file.responseContent.content.size;
    }

    let includeResponseBodies = Options.get("netexport.includeResponseBodies");
    if (includeResponseBodies) {
      content.text = file.responseContent ? file.responseContent.content.text : undefined;
    } else {
      content.comment = Locale.$STR("netexport.responseBodyNotIncluded");
    }

    return content;
  },

  buildCache: function(file) {
    let cache = {};

    if (!file.fromCache) {
      return cache;
    }

    // cache.beforeRequest = {}; //xxxHonza: There is no such info yet in
    // the Net panel.

    if (file.cacheEntry) {
      cache.afterRequest = this.buildCacheEntry(file.cacheEntry);
    } else {
      cache.afterRequest = null;
    }

    return cache;
  },

  buildCacheEntry: function(cacheEntry) {
    let cache = {};
    cache.expires = findHeader(cacheEntry, "Expires");
    cache.lastAccess = findHeader(cacheEntry, "Last Fetched");
    cache.eTag = ""; // xxxHonza
    cache.hitCount = findHeader(cacheEntry, "Fetch Count");
    return cache;
  },

  // xxxHonza: duplicated in NetUtils
  getBlockingEndTime: function(file) {
    if (file.resolveStarted && file.connectStarted) {
      return file.resolvingTime;
    }

    if (file.connectStarted) {
      return file.connectingTime;
    }

    if (file.sendStarted) {
      return file.sendingTime;
    }

    // This is how blocking end was computed before Firebug 1.8b6
    return (file.sendingTime > file.startTime) ? file.sendingTime : file.waitingForTime;
  },
}

// Helpers

function isURLEncodedFile(file, text) {
  let contentType = "content-type: application/x-www-form-urlencoded"
  if (text && text.toLowerCase().indexOf(contentType) != -1) {
    return true;
  }

  // The header value doesn't have to be always exactly
  // "application/x-www-form-urlencoded",
  // there can be even charset specified. So, use indexOf rather than just
  // "==".
  let headerValue = findHeader(file.requestHeaders, "content-type");
  if (headerValue && headerValue.indexOf("application/x-www-form-urlencoded") == 0) {
    return true;
  }

  return false;
}

function findHeader(headers, name) {
  name = name.toLowerCase();
  for (let i=0; headers && i < headers.length; ++i) {
    if (headers[i].name.toLowerCase() == name) {
      return headers[i].value;
    }
  }

  return "";
}

function safeGetName(request) {
  try {
    return request.name;
  } catch (exc) {
  }

  return null;
}

function dateToJSON(date) {
  function f(n, c) {
    if (!c) {
      c = 2;
    }

    let s = new String(n);
    while (s.length < c) {
      s = "0" + s;
    }

    return s;
  }

  let result = date.getFullYear() + '-' +
    f(date.getMonth() + 1) + '-' +
    f(date.getDate()) + 'T' +
    f(date.getHours()) + ':' +
    f(date.getMinutes()) + ':' +
    f(date.getSeconds()) + '.' +
    f(date.getMilliseconds(), 3);

  let offset = date.getTimezoneOffset();
  let positive = offset > 0;

  // Convert to positive number before using Math.floor (see issue 5512)
  offset = Math.abs(offset);
  let offsetHours = Math.floor(offset / 60);
  let offsetMinutes = Math.floor(offset % 60);
  let prettyOffset = (positive > 0 ? "-" : "+") + f(offsetHours) +
    ":" + f(offsetMinutes);

  return result + prettyOffset;
}

function parseQueryString(aQueryString) {
  // Make sure there's at least one param available.
  // Be careful here, params don't necessarily need to have values, so
  // no need to verify the existence of a "=".
  if (!aQueryString) {
    return [];
  }

  // Turn the params string into an array containing { name: value } tuples.
  let paramsArray = aQueryString.replace(/^[?&]/, "").split("&").map(e =>
    {
      let param = e.split("=");
      let name = param[0] ? NetworkHelper.convertToUnicode(unescape(param[0])) : "";
      let value = param[1] ? NetworkHelper.convertToUnicode(unescape(param[1])) : "";

      return {name, value};
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

