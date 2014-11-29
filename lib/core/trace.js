/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, Services: true, dump: true */

"use strict";

const { Cu } = require("chrome");
const PrefService = require("sdk/preferences/service");


const TraceAPI = ["dump", "sysout", "setScope", "matchesNode", "time", "timeEnd"];

// TODO Externalise this constant.
const PREF_DOMAIN = "extensions.firebug";

const PREF_JPM_RUN = "extensions.firebug@software.joehewitt.com.sdk.load.command";
const PREF_JPM_VERBOSE = "extensions.firebug@software.joehewitt.com.sdk.output.logLevel";

let FBTrace = {};
let traceServiceMode = "none";

try {
  let scope = {};
  Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
  FBTrace = scope.traceConsoleService.getTracer(PREF_DOMAIN);
  traceServiceMode = "FBTrace";
}
catch(err) {
  let noop = function(){};
  for (let method of TraceAPI) {
    FBTrace[method] = noop;
  }
  // If JPM is used to run Firebug with a verbose log level, enable FBTrace
  // fallback.
  if (PrefService.get(PREF_JPM_RUN, "") &&
    PrefService.get(PREF_JPM_VERBOSE, "")  === "verbose") {
    traceServiceMode = "os-console";
  }
}

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

/**
 * Support for scoped logging.
 *
 * @deprecated Use FBTrace.get(module.id); instead
 */
FBTrace.to = function(option) {
  // Automatically create corresponding DBG_ + <option> preference so, it
  // appears in the FBTrace Console window and can be checked on/off
  // Note that FBTrace Console is already initialized and do not refresh if a
  // new pref is created. So, the option appears after restart.
  // xxxHonza: FIX ME
  let prefName = PREF_DOMAIN + "." + option;
  let value;

  try {
    value = Services.prefs.getBoolPref(prefName);
  }
  catch(ex) {
    if (option == "DBG_ERRORS") {
      // Error logs are on by default.
      value = true;
      Services.prefs.setBoolPref(prefName, value);
    }
  }

  if (typeof(value) != "boolean") {
    value = false;
    Services.prefs.setBoolPref(prefName, value);
  }

  return new TraceWrapper(this, option);
};

/**
 * Return the appropriate Trace object. The log will appear in the
 * Trace Console only if the module is selected in the Option tab.
 *
 * @param {string} moduleId The id of the module (just pass module.id).
 *
 * @return {object} The object containing Trace and TraceError
 *
 * @example
 *   const {Trace, TraceError} = require("lib/trace").get(module.id);
 */
FBTrace.get = function(moduleId) {
  let result = { TraceError: TraceError };

  // Remove URI prefix.
  let prefixURI = module.id.slice(0, -"core/trace.js".length);
  let modulePath = moduleId.substr(prefixURI.length);

  let index = modulePath.lastIndexOf(".js");
  if (index != -1) {
    modulePath = modulePath.substr(0, index);
  }

  let dbgOption = ("DBG_" + modulePath).toUpperCase();

  result.Trace = FBTrace.to(dbgOption);
  return result;
};

var TraceError = FBTrace.to("DBG_ERRORS");

/**
 * Wraps tracer for given option. Logs made through the wrapper will
 * automatically be checked against the option and only displayed if the option
 * is true.
 * If FBTrace console isn't installed all options are false and there is no
 * additional performance penalty.
 */
function TraceWrapper(tracer, option) {
  function createMethodWrapper(method) {
    if (traceServiceMode === "FBTrace") {
      return (...args) => {
        if (tracer[option]) {
          tracer[method](...args);
        }
      };
    }
    if (traceServiceMode === "os-console" && method === "sysout") {
      return (...args) => {
        if (PrefService.get(PREF_DOMAIN + "." + option)) {
          // Invoking console.log() will send the logs to the Browser Console
          // and also dump them to the OS console.
          let message = option;
          if (args.length > 0) {
            message += " - " + args[0];
          }
          console.log(message, ...args.slice(1));
        }
      };
    }
    // By default, return noop.
    return () => {};
  }

  for (let i=0; i<TraceAPI.length; i++) {
    let method = TraceAPI[i];
    this[method] = createMethodWrapper(method);
  }

  /**
   * Use to check whether scoped tracer is on/off.
   */
  this.__defineGetter__("active", function() {
    return tracer[option];
  });
}

// Exports from this module
exports.FBTrace = FBTrace;
exports.Trace = FBTrace;
exports.TraceError = TraceError;
exports.get = FBTrace.get;
