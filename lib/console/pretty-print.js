/* See license.txt for terms of usage */
"use strict";

module.metadata = {
  "stability": "Deprecated"
};

const main = require("../main.js");

const { ChromeWorker } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Obj } = require("../core/object.js");
const { defer } = require("sdk/core/promise");
const { prefs } = require("sdk/simple-prefs");

var prettyPrintWorker;

/**
 * This object is responsible for pretty printing of given JS source code.
 * Pretty printing is done asynchronously using a background worker.
 */
var PrettyPrint =
/** @lends PrettyPrint */
{
  run: function(value) {
    if (/^\s*$/.test(value)) {
      return;
    }

    let worker = getPrettyPrintWorker();
    let id = "firebug-" + Obj.getUniqueId();
    let deferred = defer();

    let onReply = ({data}) => {
      if (data.id !== id) {
        return;
      }

      worker.removeEventListener("message", onReply, false);

      if (data.error) {
        TraceError.sysout("commandEditor.prettyPrint; ERROR " +
          data.error, data);

        // Remove stack trace info from the error message (separated by
        // a newline, see pretty-print-worker.js)
        let message = String(data.error);
        let index = message.indexOf("\n");
        message = message.substr(0, index);

        // Log only an error message into the Console panel.
        // xxxHonza: FIX ME
        //Firebug.Console.logFormatted([message], context, "error", true);

        deferred.reject(data.error);
      } else {
        deferred.resolve(data.code);
      }
    };

    worker.addEventListener("message", onReply, false);

    worker.postMessage({
      id: id,
      url: "(command-editor)",
      indent: prefs["replaceTabs"],
      source: value
    });

    return deferred.promise;
  }
}

// Local Helpers

/**
 * Get or create the worker that handles pretty printing.
 */
function getPrettyPrintWorker() {
  if (!prettyPrintWorker) {
    prettyPrintWorker = new ChromeWorker(
      "resource://gre/modules/devtools/server/actors/pretty-print-worker.js");

    prettyPrintWorker.addEventListener("error", ({msg, fileName, lineNo}) => {
      TraceError.sysout("commandEditor.getPrettyPrintWorker; ERROR " +
        msg + " " + fileName + ":" + lineNo);
    }, false);

    // Don't forget to clean up the worker when Firebug shutdowns.
    main.Firebug.once("shutdown", (reason) => {
      destroyPrettyPrintWorker();
    });
  }

  return prettyPrintWorker;
}

function destroyPrettyPrintWorker() {
  if (prettyPrintWorker) {
    prettyPrintWorker.terminate();
    prettyPrintWorker = null;
  }
}

// Exports from this module
exports.PrettyPrint = PrettyPrint;
