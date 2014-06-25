/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js");
const { prefs } = require("sdk/simple-prefs");

var Str = {};

Str.safeToString = function(ob) {
  try {
    if (!ob)
      return "" + ob;
    if (ob && (typeof (ob["toString"]) == "function") )
      return ob.toString();
    if (ob && typeof (ob["toSource"]) == "function")
      return ob.toSource();

    /* https://bugzilla.mozilla.org/show_bug.cgi?id=522590 */
    var str = "[";
    for (var p in ob)
      str += p + ",";

    return str + "]";
  }
  catch (exc) {
    TraceError.sysout("Str.safeToString FAILS " + exc, exc);
  }

  return "[unsupported: no toString() function in type " + typeof(ob)+ "]";
};

Str.cropString = function(text, limit, alternativeText)
{
    if (!alternativeText)
        alternativeText = "...";

    // Make sure it's a string.
    text = String(text);

    // Use default limit if necessary.
    if (!limit)
        limit = prefs["stringCropLength"];

    // Crop the string only if a limit is actually specified.
    if (limit <= 0)
        return text;

    // Set the limit at least to the length of the alternative text
    // plus one character of the original text.
    if (limit <= alternativeText.length)
        limit = alternativeText.length + 1;

    var halfLimit = (limit - alternativeText.length) / 2;

    if (text.length > limit)
    {
        return text.substr(0, Math.ceil(halfLimit)) + alternativeText +
            text.substr(text.length - Math.floor(halfLimit));
    }

    return text;
};

Str.cropStringEx = function(text, limit, alterText, pivot)
{
    if (!alterText)
        alterText = "...";

    // Make sure it's a string.
    text = String(text);

    // Use default limit if necessary.
    if (!limit)
        limit = prefs["stringCropLength"];

    // Crop the string only if a limit is actually specified.
    if (limit <= 0)
        return text;

    if (text.length < limit)
        return text;

    if (typeof(pivot) == "undefined")
        pivot = text.length / 2;

    var halfLimit = (limit / 2);

    // Adjust the pivot to the real center in case it's at an edge.
    if (pivot < halfLimit)
        pivot = halfLimit;

    if (pivot > text.length - halfLimit)
        pivot = text.length - halfLimit;

    // Get substring around the pivot
    var begin = Math.max(0, pivot - halfLimit);
    var end = Math.min(text.length - 1, pivot + halfLimit);
    var result = text.substring(begin, end);

    // Add alterText to the beginning or end of the result as necessary.
    if (begin > 0)
        result = alterText + result;

    if (end < text.length - 1)
        result += alterText;

    return result;
};

Str.escapeNewLines = function(value)
{
    return value.replace(/\r/gm, "\\r").replace(/\n/gm, "\\n");
};

Str.cropMultipleLines = function(text, limit)
{
    return this.escapeNewLines(this.cropString(text, limit));
};

Str.trim = function(text)
{
    return text.replace(/^\s*|\s*$/g, "");
};

Str.trimLeft = function(text)
{
    return text.replace(/^\s+/, "");
};

Str.trimRight = function(text)
{
    return text.replace(/\s+$/, "");
};

Str.hasPrefix = function(hay, needle)
{
    // Passing empty string is ok, but null or undefined is not.
    if (hay == null)
    {
        TraceError.sysout("Str.hasPrefix; string must not be null",
          {hay: hay, needle: needle});

        return false;
    }

    // This is the fastest way of testing for prefixes - (hay.indexOf(needle) === 0)
    // can be O(|hay|) in the worst case, and (hay.substr(0, needle.length) === needle)
    // unnecessarily creates a new string and might be O(|needle|) in some JavaScript
    // implementations. See the discussion in issue 3071.
    return hay.lastIndexOf(needle, 0) === 0;
};

Str.endsWith = function(str, suffix)
{
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

exports.Str = Str;
