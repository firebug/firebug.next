/* See license.txt for terms of usage */

"use strict";

// ********************************************************************************************* //
// Constants

var {Cu} = require("chrome");

// ********************************************************************************************* //
// Implementation

var FBTrace = {
  sysout: function() {}
}

try
{
    var scope = {};
    Cu["import"]("resource://firebug/firebug-trace-service.js", scope);
    FBTrace = scope.traceConsoleService.getTracer("extensions.firebug");
}
catch(err)
{
}

// ********************************************************************************************* //
// Exports

exports.Trace = FBTrace;

// ********************************************************************************************* //
