/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js");

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

exports.Str = Str;
