/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");
const { Str } = require("../core/string.js");

const ioService = Cc["@mozilla.org/network/io-service;1"].
  getService(Ci.nsIIOService);

var Url = {};

// Implementation
Url.getFileName = function(url) {
  var split = Url.splitURLBase(url);
  return split && split.name || "";
};

Url.splitURLBase = function(url) {
  if (url && url.startsWith("data:"))
      return Url.splitDataURL(url);
  return Url.splitURLTrue(url);
};

Url.splitDataURL = function(url) {
  // The first 5 chars must be 'data:'
  if (!url.startsWith("data:"))
    return false;

  var point = url.indexOf(",", 5);
  if (point < 5)
    return false; // syntax error

  var props = {
    protocol: "data",
    encodedContent: url.substr(point + 1)
  };

  var metadataBuffer = url.substring(5, point);
  var metadata = metadataBuffer.split(";");
  for (var i = 0; i < metadata.length; i++) {
    var nv = metadata[i].split("=");
    if (nv.length == 2 && !(nv[0] in props))
      props[nv[0]] = nv[1];
  }

  // Additional Firebug-specific properties
  if (props.hasOwnProperty("fileName")) {
    var caller_URL = decodeURIComponent(props["fileName"]);
    var caller_split = Url.splitURLTrue(caller_URL);

    props["fileName"] = caller_URL;
    props["name"] = caller_split.name;
    props["path"] = caller_split.path;
  }
  else {
    if (!props.hasOwnProperty("path"))
      props["path"] = "data:";

    if (!props.hasOwnProperty("name"))
      props["name"] =  decodeURIComponent(props["encodedContent"]).
        substr(0,200).replace(/\s*$/, "");
  }

  return props;
};

const reSplitFile = /^(.*?):\/{2,3}([^\/]*)(.*?)([^\/]*?)($|\?.*)/;
Url.splitURLTrue = function(url) {
  var m = reSplitFile.exec(url);
  if (!m)
    return {name: url, path: url};
  else if (m[4] == "" && m[5] == "")
    return {protocol: m[1], domain: m[2], path: m[3], name: m[3] != "/" ? m[3] : m[2]};
  else
    return {protocol: m[1], domain: m[2], path: m[2]+m[3], name: m[4]+m[5]};
};

Url.normalizeURL = function(url) {
  if (!url)
    return "";

  // Guard against monsters.
  if (url.length > 1000)
    return url;

  // Normalize path traversals (a/b/../c -> a/c).
  while (url.contains("/../") && url[0] != "/")
    url = url.replace(/[^\/]+\/\.\.\//g, "");

  // Issue 1496, avoid #
  url = url.replace(/#.*/, "");

  // For script tags inserted dynamically sometimes the script.fileName is bogus
  if (url.contains("->"))
    url = url.replace(/[^\s]*\s->\s/, "");

  if (url.startsWith("chrome:")) {
    var m = /^chrome:\/\/([^\/]*)\/(.*?)$/.exec(url);
    if (m) {
      url = "chrome://" + m[1].toLowerCase() + "/" + m[2];
    }
  }
  return url;
};

// Exports from this module
exports.Url = Url;
