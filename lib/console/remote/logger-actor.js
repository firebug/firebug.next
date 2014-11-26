/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { target } = require("../../target.js");
const { Http } = require("../../core/http.js");
const { Dom } = require("../../core/dom.js");
const { getInnerId } = require("sdk/window/utils");

const Events = require("sdk/system/events.js");
const tabUtils = require("sdk/tabs/utils");
const base64 = require("sdk/base64");

const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

// TODO support FirePHP
const acceptableLoggerHeaders = ["X-ChromeLogger-Data"];

/**
 * A method decorator that ensures the actor is in the expected state before
 * proceeding. If the actor is not in the expected state, the decorated method
 * returns a rejected promise.
 *
 * @param String expectedState
 *        The expected state.
 *
 * @param Function method
 *        The actor method to proceed with when the actor is in the expected
 *        state.
 *
 * @returns Function
 *          The decorated method.
 */
function expectState(expectedState, method) {
  return function(...args) {
    if (this.state !== expectedState) {
      let msg = "Wrong State: Expected '" + expectedState + "', but current "
        + "state is '" + this.state + "'";
      return Promise.reject(new Error(msg));
    }

    return method.apply(this, args);
  };
}

const actorTypeName = "firebugLoggerActor";

/**
 * @actor The actor is responsible for detecting server side logs
 * within HTTP headers and sending them to the client.
 */
var LoggerActor = ActorClass(
/** @lends LoggerActor */
{
  typeName: actorTypeName,

  // Initialization

  initialize: function(conn, parent) {
    Actor.prototype.initialize.call(this, conn);

    Trace.sysout("loggerActor.initialize;", this);

    this.parent = parent;
    this.state = "detached";
    this.onExamineResponse = this.onExamineResponse.bind(this);

    Events.on("http-on-examine-response", this.onExamineResponse);
  },

  destroy: function() {
    Trace.sysout("loggerActor.destroy;", arguments);

    Events.off("http-on-examine-response", this.onExamineResponse);

    if (this.state === "attached") {
      this.detach();
    }

    Actor.prototype.destroy.call(this);
  },

  /**
   * Attach to this actor.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("loggerActor.attach;", arguments);

    this.state = "attached";
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Detach from this actor.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("loggerActor.detach;", arguments);

    this.state = "detached";
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // HTTP Observer
  onExamineResponse: function(event) {
    let { subject } = event;
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    let tab = getTabFromHttpChannel(subject);

    if (!tab) {
      return;
    }

    // Filter out responses coming from different tabs.
    // xxxHonza: is there a better way how to get the current tab ID?
    let linkedBrowser = this.parent._tabbrowser.mCurrentTab.linkedBrowser;
    if (tab.linkedBrowser != linkedBrowser) {
      Trace.sysout("loggerActor.onExamineResponse; different tab " +
        tab.linkedBrowser + ", " + linkedBrowser);
      return;
    }

    let parsedMessages = [];

    httpChannel.visitResponseHeaders((header, value) => {
      if (acceptableLoggerHeaders.indexOf(header) !== -1) {
        let messages = this.parse(header, value);
        parsedMessages.push(...messages);
      }
    });

    if (!parsedMessages.length) {
      return;
    }

    // better variable names for parsedMessages, parsedMessage and msg
    // (probably a little piece of refactoring)
    for (let message of parsedMessages) {
      this.sendMessage(message, tab);
    }
  },

  // TODO parse should invoke the parse method of a dedicated module.
  // Example:
  parse: function(header, value) {
    let data = JSON.parse(base64.decode(value));
    let parsedMessage = [];
    let columnMap = this.getColumnMap(data);

    for (let row of data.rows) {
      let backtrace = row[columnMap.get("backtrace")];
      let label = row[columnMap.get("label")];
      let rawLogs = row[columnMap.get("log")];
      let type = row[columnMap.get("type")] || "log";

      // new version without label
      let newVersion = false;
      if (data.columns.indexOf("label") === -1) {
        newVersion = true;
      }

      // if this is the old version do some converting
      if (!newVersion) {
        let showLabel = label && typeof label === "string";

        rawLogs = [rawLogs];

        if (showLabel) {
          rawLogs.unshift(label);
        }
      }

      // xxxHonza: can we simplify the url and line info extraction?
      let result = backtrace.match(/\s*(\d+)\:(\d+)$/);
      let location;
      if (result.length == 3) {
        location = {
          url: backtrace.slice(0, -result[0].length),
          line: result[1]
        };
      }

      parsedMessage.push({
        logs: rawLogs,
        location: location,
        type: type
      });
    }

    return parsedMessage;
  },

  getColumnMap: function(data) {
    let columnMap = new Map();
    let columnName;

    for (let key in data.columns) {
      columnName = data.columns[key];
      columnMap.set(columnName, key);
    }

    return columnMap;
  },

  sendMessage: function(msg, tab) {
    Trace.sysout("loggerActor.sendMessage; raw: " + msg.logs.join(", "), msg);

    let formatted = format(msg);

    // TODO: use the ___class_name property for object customization (#101).
    for (let log of formatted.logs) {
      if (typeof log == "object") {
        delete log.___class_name;
      }
    }

    let packet = {
      from: this.actorID,
      type: msg.type,
      message: {
        category: "server",
        innerID: getInnerId(this.parent.window),
        level: msg.type,
        filename: msg.location.url,
        lineNumber: msg.location.line,
        columnNumber: 0,
        private: false,
        timeStamp: Date.now(),
        arguments: formatted.logs,
        styles: formatted.styles,
      }
    };

    // Send raw data to the client {@LoggerFront}
    // TODO send to our own Front rather than to the WebConsole one.
    // this.conn.send(packet);

    // Log into the console using standard API now.
    // xxxHonza: custom logging should be implemented
    // by {@LoggerFront} object.
    let consoleEvent = clone(packet.message);
    consoleEvent.wrappedJSObject = consoleEvent;

    Services.obs.notifyObservers(consoleEvent,
      "console-api-log-event", null);
  },
});

// Helpers

function clone(obj = {}) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Parse printf-like specifiers ("%f", "%d", ...) and
 * format the logs according to them.
 */
function format(msg) {
  if (!msg.logs || !msg.logs[0]) {
    return;
  }

  // Initialize the styles array (used for the "%c" specifier).
  msg.styles = [];

  // Remove and get the first log (in which the specifiers are).
  let firstString = msg.logs.shift();
  // Contains all the strings split by the specifiers
  // (i.e. "a %f b" => ["a ", " b"]).
  let splitLog = [];
  // All the specifiers present in the first string.
  let specifiers = [];
  let specifierIndex = -1;
  let splitLogRegExp = /(.*?)(%[oOcsdif]|$)/g;
  let splitLogRegExpRes;

  // Get the strings before the specifiers (or the last chunk before the end
  // of the string).
  while (splitLogRegExpRes = splitLogRegExp.exec(firstString)) {
    let [_, log, specifier] = splitLogRegExpRes;

    // We can add an empty string if there is a specifier after (which
    // means we haven't reached the end of the string). This empty string is
    // necessary when rebuilding the logs after the formatting (we should ensure
    // to alternate a log + a specifier to replace to make this loop work).
    //
    // Example: "%ctest" => first iteration: log = "", specifier = "%c".
    //                   => second iteration: log = "test", specifier = "".
    if (log || specifier) {
      splitLog.push(log);
    }

    // Break now if there is no specifier anymore
    // (means that we have reached the end of the string).
    if (!specifier) {
      break;
    }

    specifiers.push(specifier);
  }

  // This array represents the string of the log, in which the specifiers
  // are replaced. It alternates strings and objects (%o;%O).
  let rebuiltLogArray = [];
  let concatString = "";
  let pushConcatString = () => {
    if (concatString) {
      rebuiltLogArray.push(concatString);
    }
    concatString = "";
  };

  // Merge the split first string and the values associated to the specifiers.
  splitLog.forEach((string, index) => {
    // Concatene the string in any case.
    concatString += string;
    if (specifiers.length === 0) {
      return;
    }

    let argument = msg.logs.shift();
    switch (specifiers[index]) {
      case "%i":
      case "%d":
        // Parse into integer.
        argument |= 0;
        concatString += argument;
        break;
      case "%f":
        // Parse into float.
        argument = +argument;
        concatString += argument;
        break;
      case "%o":
      case "%O":
        // Push the concatened string and reintialize concatString.
        pushConcatString();
        // Push the object.
        rebuiltLogArray.push(argument);
        break;
      case "%s":
        concatString += argument;
        break;
      case "%c":
        pushConcatString();
        for (let j = msg.styles.length; j < rebuiltLogArray.length; j++) {
          msg.styles.push(null);
        }
        msg.styles.push(argument);
        // Go to next iteration directly.
        return;
      default:
        // Should never happen.
        return;
    }
  });

  if (concatString) {
    rebuiltLogArray.push(concatString);
  }

  // Prepend the items of the rebuilt log array of the first string
  // to the message logs.
  msg.logs = rebuiltLogArray.concat(msg.logs);

  return msg;
}

function getTabFromHttpChannel(httpChannel) {
  let topFrame = Http.getTopFrameElementForRequest(httpChannel);
  if (!topFrame) {
    return;
  }

  // In case of in-process debugging (no e10s) the result topFrame
  // represents the content window.
  let winType = topFrame.Window;
  if (typeof winType != "undefined" && topFrame instanceof winType) {
    return tabUtils.getTabForContentWindow(topFrame);
  }

  // ... otherwise the topFrame represents the content window parent frame.
  let notificationBox = Dom.getAncestorByTagName(topFrame, "notificationbox");
  if (!notificationBox) {
    Trace.sysout("loggerActor.getTabFromHttpChannel; " +
      "notificationbox not found");
    return;
  }

  return notificationBox.ownerDocument.querySelector(
    "#tabbrowser-tabs [linkedpanel='" + notificationBox.id + "']");
}

// Note: Future work for special rendering.
/*DebuggerServer.ObjectActorPreviewers.Object.unshift(
  function ChromeLoggerRemoteObject({obj, threadActor}, aGrip) {
    if (!obj.__class_name)
      return false;
    aGrip.preview = {
      kind: "ChromeLoggerRemoteObject",
      text: threadActor.createValueGrip(`[Remote ${obj.___class_name}]`)
    };
    return true;
  }
); */

// Registration

// xxxHonza: remote device debugging requires dynamic actor installation.
// See also:
// * https://bugzilla.mozilla.org/show_bug.cgi?id=977443
// * https://bugzilla.mozilla.org/show_bug.cgi?id=980481
target.on("initialize", Firebug => {
  DebuggerServer.registerModule(module.uri);
});

target.on("shutdown", Firebug => {
  DebuggerServer.unregisterModule(module.uri);
});

exports.register = function(handle) {
  handle.addTabActor(LoggerActor, actorTypeName);
};

exports.unregister = function(handle) {
  handle.removeTabActor(LoggerActor, actorTypeName);
};

// Exports from this module
exports.LoggerActor = LoggerActor;
