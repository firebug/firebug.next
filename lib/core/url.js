/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");
const { Str } = require("../core/string.js");
const { StrEx } = require("../core/string-ex.js");
const { Options } = require("../core/options.js");

const ioService = Cc["@mozilla.org/network/io-service;1"].
  getService(Ci.nsIIOService);

var Url = {};

// Implementation
Url.getFileName = function(url) {
  let split = Url.splitURLBase(url);
  return split.name;
};

Url.getProtocol = function(url) {
  let split = Url.splitURLBase(url);
  return split.protocol;
};

Url.splitURLBase = function(url) {
  if (Url.isDataURL(url)) {
    return Url.splitDataURL(url);
  }
  return Url.splitURLTrue(url);
};

Url.splitDataURL = function(url) {
  // The first 5 chars must be 'data:'
  if (!url || !url.startsWith("data:")) {
    return false;
  }

  let point = url.indexOf(",", 5);
  if (point < 5) {
    return false; // syntax error
  }

  let props = {
    protocol: "data",
    encodedContent: url.substr(point + 1)
  };

  let metadataBuffer = url.substring(5, point);
  let metadata = metadataBuffer.split(";");
  for (var i = 0; i < metadata.length; i++) {
    let nv = metadata[i].split("=");
    if (nv.length == 2) {
      props[nv[0]] = nv[1];
    }
  }

  // Additional Firebug-specific properties
  if (props.hasOwnProperty("fileName")) {
    let caller_URL = decodeURIComponent(props["fileName"]);
    let caller_split = Url.splitURLTrue(caller_URL);

    props["fileName"] = caller_URL;

    // this means it's probably an eval()
    if (props.hasOwnProperty("baseLineNumber")) {
      props["path"] = caller_split.path;
      props["line"] = props["baseLineNumber"];
      let hint = decodeURIComponent(props["encodedContent"]).
        substr(0,200).replace(/\s*$/, "");
      props["name"] =  "eval->"+hint;
    } else {
      props["name"] = caller_split.name;
      props["path"] = caller_split.path;
    }
  } else {
    if (!props.hasOwnProperty("path")) {
      props["path"] = "data:";
    }

    if (!props.hasOwnProperty("name")) {
      props["name"] =  decodeURIComponent(props["encodedContent"]).
        substr(0,200).replace(/\s*$/, "");
    }
  }

  return props;
};

const reSplitFile = /(.*?):\/{2,3}([^\/]*)(.*?)([^\/]*?)($|\?.*)/;
Url.splitURLTrue = function(url) {
  let m = reSplitFile.exec(url);
  if (!m) {
    return {name: url, path: url};
  } else if (m[4] == "" && m[5] == "") {
    return {protocol: m[1], domain: m[2], path: m[3], name: m[3] != "/" ? m[3] : m[2]};
  } else {
    return {protocol: m[1], domain: m[2], path: m[2]+m[3], name: m[4]+m[5]};
  }
};

Url.getFileExtension = function(url) {
  if (!url) {
    return null;
  }

  // Remove query string from the URL if any.
  let queryString = url.indexOf("?");
  if (queryString != -1) {
    url = url.substr(0, queryString);
  }

  // Now get the file extension.
  let lastDot = url.lastIndexOf(".");
  return url.substr(lastDot+1);
};

Url.isSystemURL = function(url) {
  if (!url) {
    return true;
  }

  if (url.length == 0) {
    return true;
  }

  if (url[0] == "h") {
    return false;
  }

  if (url.substr(0, 9) == "resource:") {
    return true;
  } else if (url.substr(0, 16) == "chrome://firebug") {
    return true;
  } else if (url.substr(0, 6) == "about:") {
    return true;
  } else {
    return false;
  }
};

Url.isSystemPage = function(win) {
  try {
    let doc = win.document;
    if (!doc) {
      return false;
    }

    // Detect pages for pretty printed XML
    if ((doc.styleSheets.length && doc.styleSheets[0].href
        == "chrome://global/content/xml/XMLPrettyPrint.css")
      || (doc.styleSheets.length > 1 && doc.styleSheets[1].href
        == "chrome://browser/skin/feeds/subscribe.css")) {
      return true;
    }

    return Url.isSystemURL(win.location.href);
  }
  catch (exc) {
    // Sometimes documents just aren't ready to be manipulated here,
    // but don't let that
    // gum up the works
    TraceError.sysout("Url.isSystemPage; EXCEPTION document not ready?: " +
      exc);

    return false;
  }
};

Url.isSystemStyleSheet = function(sheet) {
  let href = sheet && sheet.href;
  return href && Url.isSystemURL(href);
};

Url.getURIHost = function(uri) {
  try {
    if (uri) {
      return uri.host;
    } else {
      return "";
    }
  }
  catch (exc) {
    return "";
  }
};

Url.isLocalURL = function(url) {
  if (url.substr(0, 5) == "file:") {
    return true;
  } else if (url.substr(0, 8) == "wyciwyg:") {
    return true;
  } else {
    return false;
  }
};

Url.isDataURL = function(url) {
  return (url && url.substr(0,5) == "data:");
};

Url.getLocalPath = function(url) {
  if (this.isLocalURL(url)) {
    let fileHandler = ioService.getProtocolHandler("file")
    .QueryInterface(Ci.nsIFileProtocolHandler);
    let file = fileHandler.getFileFromURLSpec(url);
    return file.path;
  }
};

/**
 * Mozilla URI from non-web URL
 * @param URL
 * @returns undefined or nsIURI
 */
Url.getLocalSystemURI = function(url) {
  try {
    let uri = ioService.newURI(url, null, null);
    if (uri.schemeIs("resource")) {
      let ph = ioService.getProtocolHandler("resource")
      .QueryInterface(Ci.nsIResProtocolHandler);
      let abspath = ph.getSubstitution(uri.host);
      uri = ioService.newURI(uri.path.substr(1), null, abspath);
    }
    while (uri.schemeIs("chrome")) {
      let chromeRegistry = Cc["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Ci.nsIChromeRegistry);
      uri = chromeRegistry.convertChromeURL(uri);
    }
    return uri;
  }
  catch (exc) {
    TraceError.sysout("getLocalSystemURI failed for " + url);
  }
};

/*
 * Mozilla native path for local URL
 */
Url.getLocalOrSystemPath = function(url, allowDirectories) {
  let uri = Url.getLocalSystemURI(url);
  if (uri instanceof Ci.nsIFileURL) {
    let file = uri.file;
    if (allowDirectories) {
      return file && file.path;
    } else {
      return file && !file.isDirectory() && file.path;
    }
  }
};

Url.getLocalOrSystemFile = function(url) {
  let uri = Url.getLocalSystemURI(url);
  if (uri instanceof Ci.nsIFileURL) {
    return uri.file;
  }
};

Url.getURLFromLocalFile = function(file) {
  let fileHandler = ioService.getProtocolHandler("file")
  .QueryInterface(Ci.nsIFileProtocolHandler);
  let URL = fileHandler.getURLSpecFromFile(file);
  return URL;
};

Url.getDataURLForContent = function(content, url) {
  // data:text/javascript;fileName=x%2Cy.js;baseLineNumber=10,<the-url-encoded-data>
  let uri = "data:text/html;";
  uri += "fileName="+encodeURIComponent(url)+ ",";
  uri += encodeURIComponent(content);
  return uri;
};

Url.getDomain = function(url) {
  let m = /[^:]+:\/{1,3}([^\/]+)/.exec(url);
  return m ? m[1] : "";
};

Url.getURLPath = function(url) {
  let m = /[^:]+:\/{1,3}[^\/]+(\/.*?)$/.exec(url);
  return m ? m[1] : "";
};

Url.getPrettyDomain = function(url) {
  let m = /[^:]+:\/{1,3}(www\.)?([^\/]+)/.exec(url);
  return m ? m[2] : "";
};

/**
 * Returns the base URL for a given window
 * @param {Object} win DOM window
 * @returns {String} Base URL
 */
Url.getBaseURL = function(win) {
  if (!win) {
    return;
  }

  let base = win.document.getElementsByTagName("base").item(0);
  return base ? base.href : win.location.href;
};

/**
 * Returns true if the URL is absolute otherwise false, see the following
 * examples:
 *
 * 1) http://example.com -> true
 * 2) //myserver/index.html -> true
 * 3) index.html -> false
 * 4) /index.html -> false
 *
 * @param {String} URL
 * @returns {Boolean} True if the URL is absolute.
 */
Url.isAbsoluteUrl = function(url) {
  return (/^(?:[a-z]+:)?\/\//i.test(url))
}

Url.absoluteURL = function(url, baseURL) {
  // Replace "/./" with "/" using regular expressions (don't use string since /./
  // can be treated as regular expressoin too, see 3551).
  return Url.absoluteURLWithDots(url, baseURL).replace(/\/\.\//, "/", "g");
};

Url.absoluteURLWithDots = function(url, baseURL) {
  // Should implement http://www.apps.ietf.org/rfc/rfc3986.html#sec-5
  // or use the newURI approach described in issue 3110.
  // See tests/content/lib/absoluteURLs.js

  if (url.length === 0) {
    return baseURL;
  }

  let R_query_index = url.indexOf("?");
  let R_head = url;
  if (R_query_index !== -1) {
    R_head = url.substr(0, R_query_index);
  }

  if (url.indexOf(":") !== -1) {
    return url;
  }

  let reURL = /(([^:]+:)\/{1,2}[^\/]*)(.*?)$/;
  let m_url = reURL.exec(R_head);
  if (m_url) {
    return url;
  }

  let B_query_index = baseURL.indexOf("?");
  let B_head = baseURL;
  if (B_query_index !== -1) {
    B_head = baseURL.substr(0, B_query_index);
  }

  // cases where R.path is empty.
  if (url[0] === "?") {
    return B_head + url;
  }

  if  (url[0] === "#") {
    return baseURL.split("#")[0]+url;
  }

  let m = reURL.exec(B_head);
  if (!m) {
    return "";
  }

  let head = m[1];
  let tail = m[3];
  if (url.substr(0, 2) == "//") {
    return m[2] + url;
  } else if (url[0] == "/"){
    return head + url;
  } else if (tail[tail.length-1] == "/") {
    return B_head + url;
  } else {
    let parts = tail.split("/");
    return head + parts.slice(0, parts.length-1).join("/") + "/" + url;
  }
};

/**
 * xxxHonza: This gets called a lot, any performance improvement welcome.
 */
Url.normalizeURL = function(url) {
  if (!url) {
    return "";
  }

  // Guard against monsters.
  if (url.length > 255) {
    return url;
  }

  // Normalize path traversals (a/b/../c -> a/c).
  while (url.indexOf("/../") !== -1 && url[0] != "/") {
    url = url.replace(/[^\/]+\/\.\.\//g, "");
  }

  // Issue 1496, avoid #
  url = url.replace(/#.*/, "");

  // For script tags inserted dynamically sometimes the script.fileName is bogus
  if (url.indexOf("->") !== -1) {
    url = url.replace(/[^\s]*\s->\s/, "");
  }

  if (url.startsWith("chrome:")) {
    let m = /^chrome:\/\/([^\/]*)\/(.*?)$/.exec(url);
    if (m) {
      url = "chrome://" + m[1].toLowerCase() + "/" + m[2];
    }
  }
  return url;
};

Url.denormalizeURL = function(url) {
  return url.replace(/file:\/\/\//g, "file:/");
};

Url.parseURLParams = function(url) {
  let q = url ? url.indexOf("?") : -1;
  if (q == -1) {
    return [];
  }

  let search = url.substr(q+1);
  let h = search.lastIndexOf("#");
  if (h != -1) {
    search = search.substr(0, h);
  }

  if (!search) {
    return [];
  }

  return Url.parseURLEncodedText(search);
};

Url.parseURLEncodedText = function(text, noLimit) {
  const maxValueLength = 25000;

  let params = [];

  // In case the text is empty just return the empty parameters
  if (text == "") {
    return params;
  }

  // Unescape '+' characters that are used to encode a space.
  // See section 2.2.in RFC 3986: http://www.ietf.org/rfc/rfc3986.txt
  text = text.replace(/\+/g, " ");

  // Unescape '&amp;' character
  text = StrEx.unescapeForURL(text);

  function decodeText(text) {
    try {
      return decodeURIComponent(text);
    }
    catch (e) {
      return decodeURIComponent(unescape(text));
    }
  }

  let args = text.split("&");
  for (var i = 0; i < args.length; ++i) {
    try {
      let index = args[i].indexOf("=");
      if (index != -1) {
        let paramName = args[i].substring(0, index);
        let paramValue = args[i].substring(index + 1);

        if (paramValue.length > maxValueLength && !noLimit) {
          paramValue = Locale.$STR("LargeData");
        }

        params.push({name: decodeText(paramName), value: decodeText(paramValue)});
      }
      else {
        let paramName = args[i];
        params.push({name: decodeText(paramName), value: ""});
      }
    }
    catch (e) {
      if (TraceError.active) {
        TraceError.sysout("parseURLEncodedText EXCEPTION ", e);
        TraceError.sysout("parseURLEncodedText EXCEPTION URI", args[i]);
      }
    }
  }

  if (Options.get("netSortPostParameters")) {
    params.sort((a, b) => { return a.name <= b.name ? -1 : 1; });
  }

  return params;
};

Url.reEncodeURL = function(file, text, noLimit) {
  let lines = text.split("\n");
  let params = Url.parseURLEncodedText(lines[lines.length-1], noLimit);

  let args = [];
  for (var i = 0; i < params.length; ++i) {
    args.push(encodeURIComponent(params[i].name)+"="+
      encodeURIComponent(params[i].value));
  }

  let url = file.href;
  url += (url.indexOf("?") == -1 ? "?" : "&") + args.join("&");

  return url;
};

/**
 * Extracts the URL from a CSS URL definition.
 * Example: url(../path/to/file) => ../path/to/file
 * @param {String} url CSS URL definition
 * @returns {String} Extracted URL
 */
Url.extractFromCSS = function(url) {
  return url.replace(/^url\(["']?(.*?)["']?\)$/, "$1");
};

Url.makeURI = function(urlString) {
  try {
    if (urlString) {
      return ioService.newURI(urlString, null, null);
    }
  }
  catch (exc) {
    //var explain = {message: "Firebug.lib.makeURI FAILS", url: urlString,
    // exception: exc};
    // todo convert explain to json and then to data url
    TraceError.sysout("makeURI FAILS for \"" + urlString + "\" ", exc);

    return false;
  }
};

/**
 * Converts resource: to file: Url.
 * @param {String} resourceURL
 */
Url.resourceToFile = function(resourceURL) {
  let resHandler = ioService.getProtocolHandler("resource")
    .QueryInterface(Ci.nsIResProtocolHandler);

  let justURL = resourceURL.split("resource://")[1];
  let split = justURL.split("/");
  let sub = split.shift();

  let path = resHandler.getSubstitution(sub).spec;
  return path + split.join("/");
};

Url.makeURI = function(urlString) {
  try {
    if (urlString) {
      return ioService.newURI(urlString, null, null);
    }
  } catch (exc) {
    TraceError.sysout("makeURI FAILS for \""+urlString+"\" ", exc);
    return false;
  }
};

// Exports from this module
exports.Url = Url;
