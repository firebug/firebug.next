/* See license.txt for terms of usage */

"use strict";

var { Cu } = require("chrome");

var FBTrace = {
  sysout: function() {}
}

try {
  var scope = {};
  Cu["import"]("resource://firebug/firebug-trace-service.js", scope);
  FBTrace = scope.traceConsoleService.getTracer("extensions.firebug");
}
catch(err) {
}

// xxxHonza: hack for now, should be properly implemented together with:
// https://github.com/firebug/firebug.next/issues/1
var TraceError = {
  sysout: function() {
    if (FBTrace.DBG_ERRORS)
      FBTrace.sysout.apply(FBTrace, arguments);
  }
}

// Exports from
exports.Trace = FBTrace;
exports.TraceError = TraceError;
