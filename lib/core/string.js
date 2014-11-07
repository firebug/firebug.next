/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");

var Str = {};

Str.safeToString = function(ob) {
  try {
    if (!ob) {
      return "" + ob;
    }

    if (ob && (typeof (ob["toString"]) == "function")) {
      return ob.toString();
    }

    if (ob && typeof (ob["toSource"]) == "function") {
      return ob.toSource();
    }

    /* https://bugzilla.mozilla.org/show_bug.cgi?id=522590 */
    let str = "[";
    for (let p in ob) {
      str += p + ",";
    }

    return str + "]";
  }
  catch (exc) {
    TraceError.sysout("Str.safeToString FAILS " + exc, exc);
  }

  return "[unsupported: no toString() function in type " + typeof(ob)+ "]";
};

Str.cropString = function(text, limit, alternativeText)
{
  if (!alternativeText) {
    alternativeText = "...";
  }

  // Make sure it's a string.
  text = String(text);

  // Use default limit if necessary.
  if (!limit) {
    limit = prefs["stringCropLength"];
  }

  // Crop the string only if a limit is actually specified.
  if (limit <= 0) {
    return text;
  }

  // Set the limit at least to the length of the alternative text
  // plus one character of the original text.
  if (limit <= alternativeText.length) {
    limit = alternativeText.length + 1;
  }

  let halfLimit = (limit - alternativeText.length) / 2;

  if (text.length > limit) {
    return text.substr(0, Math.ceil(halfLimit)) + alternativeText +
    text.substr(text.length - Math.floor(halfLimit));
  }

  return text;
};

Str.cropStringEx = function(text, limit, alterText, pivot)
{
  if (!alterText) {
    alterText = "...";
  }

  // Make sure it's a string.
  text = String(text);

  // Use default limit if necessary.
  if (!limit) {
    limit = prefs["stringCropLength"];
  }

  // Crop the string only if a limit is actually specified.
  if (limit <= 0) {
    return text;
  }

  if (text.length < limit) {
    return text;
  }

  if (typeof(pivot) == "undefined") {
    pivot = text.length / 2;
  }

  let halfLimit = (limit / 2);

  // Adjust the pivot to the real center in case it's at an edge.
  if (pivot < halfLimit) {
    pivot = halfLimit;
  }

  if (pivot > text.length - halfLimit) {
    pivot = text.length - halfLimit;
  }

  // Get substring around the pivot
  let begin = Math.max(0, pivot - halfLimit);
  let end = Math.min(text.length - 1, pivot + halfLimit);
  let result = text.substring(begin, end);

  // Add alterText to the beginning or end of the result as necessary.
  if (begin > 0) {
    result = alterText + result;
  }

  if (end < text.length - 1) {
    result += alterText;
  }

  return result;
};

Str.escapeNewLines = function(value) {
  return value.replace(/\r/gm, "\\r").replace(/\n/gm, "\\n");
};

Str.cropMultipleLines = function(text, limit) {
  return this.escapeNewLines(this.cropString(text, limit));
};

/**
 * Returns a formatted time string
 *
 * Examples:
 * Str.formatTime(12345678) => default formatting options => "3h 25m 45.678s"
 * Str.formatTime(12345678, "ms") => use milliseconds as min. time unit => "3h 25m 45s 678ms"
 * Str.formatTime(12345678, null, "m") => use minutes as max. time unit => "205m 45.678s"
 * Str.formatTime(12345678, "m", "h") => use minutes as min. and hours as max. time unit
 *     => "3h 25.7613m"
 *
 * @param {Integer} time Time to format in milliseconds
 * @param {Integer} [minTimeUnit=1] Minimal time unit to use in the formatted string
 *     (default is seconds)
 * @param {Integer} [maxTimeUnit=4] Maximal time unit to use in the formatted string
 *     (default is days)
 * @returns {String} Formatted time string
 */
Str.formatTime = function(time, minTimeUnit, maxTimeUnit, decimalPlaces) {
  let normalizedTime = parseInt(time);
  if (isNaN(normalizedTime)) {
    return "";
  }

  let timeUnits = [{
    unit: "ms",
    interval: 1000
  },{
    unit: "s",
    interval: 60
  },{
    unit: "m",
    interval: 60
  },{
    unit: "h",
    interval: 24
  },{
    unit: "d",
    interval: 1
  }];

  if (normalizedTime == -1) {
    return "";
  }
  else {
    // Get the index of the min. and max. time unit and the decimal places
    let minTimeUnitIndex = (Math.abs(normalizedTime) < 1000) ? 0 : 1;
    let maxTimeUnitIndex = timeUnits.length - 1;

    for (let i=0, len=timeUnits.length; i<len; ++i) {
      if (timeUnits[i].unit == minTimeUnit) {
        minTimeUnitIndex = i;
      }

      if (timeUnits[i].unit == maxTimeUnit) {
        maxTimeUnitIndex = i;
      }
    }

    if (!decimalPlaces) {
      decimalPlaces = (Math.abs(normalizedTime) >= 60000 && minTimeUnitIndex == 1 ? 0 : 2);
    }

    // Calculate the maximal time interval
    let timeUnitInterval = 1;
    for (let i=0; i<maxTimeUnitIndex; ++i) {
      timeUnitInterval *= timeUnits[i].interval;
    }

    let formattedString = (normalizedTime < 0 ? "-" : "");
    normalizedTime = Math.abs(normalizedTime);
    for (let i=maxTimeUnitIndex; i>=minTimeUnitIndex; --i) {
      let value = normalizedTime / timeUnitInterval;
      if (i != minTimeUnitIndex) {
        if (value < 0) {
          value = Math.ceil(value);
        } else {
          value = Math.floor(value);
        }
      } else {
        let decimalFactor = Math.pow(10, decimalPlaces);
        value = Math.round(value * decimalFactor) / decimalFactor;
      }

      if (value != 0 || (i == minTimeUnitIndex && formattedString == "")) {
        formattedString += value.toLocaleString() + timeUnits[i].unit + " ";
      }

      time %= timeUnitInterval;

      if (i != 0) {
        timeUnitInterval /= timeUnits[i - 1].interval;
      }
    }

    return formattedString.trim();
  }
};

exports.Str = Str;
