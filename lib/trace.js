var {Cu} = require("chrome");

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

exports.Trace = FBTrace;