/* See license.txt for terms of usage */

"use strict";

/**
 * Note: This file is loaded on the back-end (can be a remote device) in
 * a sandbox that doesn't have all usual globals and modules (introduced by
 * e.g. Add-on SDK).
 *
 * It can also be loaded in a child process if the backend runs on
 * multiprocess Gecko.
 *
 * Also, remote devices can use various (old) versions of
 * Add-on SDK and the platform. So, be careful when using external
 * dependencies they don't have to exist (such as FBTrace).
 */

const { Cc, Ci, Cu } = require("chrome");

// Placeholder for tracing API.
// xxxHonza: conditional logging needed
var Trace = {
  sysout: function(msg, ...args) {
    try {
      Cu.reportError(msg + " --- " + args.map(x => x.toString()).join(" ; "));

      let scope = {};
      Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
      let FBTrace = scope.traceConsoleService.getTracer("extensions.firebug");
      FBTrace.sysout(msg, args);
    }
    catch(err) {
      Cu.reportError(msg + " --- " + args.map(x => x.toString()).join(" ; "));
    }
  }
};

const Events = require("sdk/system/events.js");
const { getTabForContentWindow, getBrowserForTab }  = require("sdk/tabs/utils");
const base64 = require("sdk/base64");
const WindowUtils = require("sdk/window/utils");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;
const DevToolsUtils = devtools.require("devtools/toolkit/DevToolsUtils.js");

// TODO support FirePHP
const acceptableHeaders = ["x-chromelogger-data"];

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
      let msg = "Wrong State: Expected '" + expectedState + "', but current " +
        "state is '" + this.state + "'";
      return Promise.reject(new Error(msg));
    }

    try {
      return method.apply(this, args);
    } catch (err) {
      Trace.sysout("loggerActor EXCEPTION " + err, err);
    }
  };
}

const actorTypeName = "firebugLogger";

/**
 * @actor The actor is responsible for detecting server side logs
 * within HTTP headers and sending them to the client.
 *
 * The detection logic is based on "http-on-examine-response" that is
 * sent when a response from the server is received. Consequently HTTP
 * headers are parsed to find server side logs.
 *
 * A listeners for "http-on-examine-response" is registered when
 * the front sends 'attach' to the actor and removed when 'detach'
 * is sent. The front should make sure it's attached only if necessary
 * to avoid unnecessary HTTP headers parsing.
 */
var LoggerActor = ActorClass(
/** @lends LoggerActor */
{
  typeName: actorTypeName,

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("loggerActor.initialize;", this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";
    this.onExamineResponse = this.onExamineResponse.bind(this);
    this.onExamineHeaders = this.onExamineHeaders.bind(this);
  },

  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   */
  destroy: function() {
    Trace.sysout("loggerActor.destroy; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }

    sendAsyncMessage("http-monitor:shutdown");

    Actor.prototype.destroy.call(this);
  },

  /**
   * Automatically executed by the framework when the parent connection
   * is closed.
   */
  disconnect: function() {
    Trace.sysout("loggerActor.disconnect; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }
  },

  /**
   * Attach to this actor. Executed when the front (client) is attaching
   * to this actor in order to receive server side logs.
   *
   * The main responsibility of this method is registering a listener for
   * "http-on-examine-response" events.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("loggerActor.attach;", arguments);

    this.state = "attached";

    if (DebuggerServer.parentMessageManager) {
      let { addMessageListener, sendSyncMessage } =
        DebuggerServer.parentMessageManager;

      let winId = WindowUtils.getOuterId(this.parent._originalWindow);

      addMessageListener("http-monitor:examine-headers", this.onExamineHeaders);
      sendSyncMessage("http-monitor:attach-child", {
        actorID: this.actorID,
        winId: winId
      });
    } else {
      Events.on("http-on-examine-response", this.onExamineResponse);
    }
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),

  /**
   * Detach from this actor. Executed when the front (client) detaches
   * from this actor since it isn't interested in server side logs
   * any more. So, let's remove the "http-on-examine-response" listener.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("loggerActor.detach;", arguments);

    this.state = "detached";

    if (DebuggerServer.parentMessageManager) {
      let { sendSyncMessage } = DebuggerServer.parentMessageManager;
      return sendSyncMessage("http-monitor:detach-child", {
        actorID: this.actorID
      });
    } else {
      Events.off("http-on-examine-response", this.onExamineResponse);
    }
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // HTTP Observer

  onExamineHeaders: function(event) {
    let headers = event.data.headers;

    Trace.sysout("loggerActor.onExamineHeaders;", headers);

    let parsedMessages = [];

    headers.forEach(item => {
      let header = item.header.toLowerCase();
      let value = item.value;

      if (acceptableHeaders.indexOf(header) !== -1) {
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
      this.sendMessage(message);
    }
  },

  onExamineResponse: function(event) {
    let { subject } = event;
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    let tab = getTabFromHttpChannel(subject);

    Trace.sysout("loggerActor.onExamineResponse; " + httpChannel.name,
      httpChannel);

    if (!tab) {
      return;
    }

    // tab.linkedBrowser is the property supported by the desktop version.
    // tab.browser looks to be the same property for the Android version.
    // xxxFlorent: Shouldn't there be a property that can be used for both?
    let linkedBrowser = getBrowserForTab(tab);
    if (linkedBrowser !== this.parent.browser) {
      return;
    }

    let headers = [];

    httpChannel.visitResponseHeaders((header, value) => {
      header = header.toLowerCase();
      if (acceptableHeaders.indexOf(header) !== -1) {
        headers.push({header: header, value: value});
      }
    });

    this.onExamineHeaders({ data: { headers: headers }});
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

  sendMessage: function(msg) {
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
    // FIXME We should use our proper Front to handle messages.
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
  while ((splitLogRegExpRes = splitLogRegExp.exec(firstString)) !== null) {
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
    // Concatenate the string in any case.
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
        // Push the concatenated string and reinitialize concatString.
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
  let topFrame = getTopFrameElementForRequest(httpChannel);
  if (!topFrame) {
    return;
  }

  // In case of in-process debugging (no e10s) the result topFrame
  // represents the content window.
  let winType = topFrame.Window;
  if (typeof winType != "undefined" && topFrame instanceof winType) {
    return getTabForContentWindow(topFrame);
  }

  // ... otherwise the topFrame represents the content window parent frame.
  let notificationBox = getAncestorByTagName(topFrame, "notificationbox");
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

// Helpers

function getTopFrameElementForRequest(request) {
  let loadContext = getRequestLoadContext(request);
  if (!loadContext)
    return;

  try {
    if (loadContext.topFrameElement)
      return loadContext.topFrameElement;
  }
  catch (err) {
  }

  try {
    if (loadContext.topWindow)
      return loadContext.topWindow;
  }
  catch (err) {
  }

  return null;
}

function getInnerId(window) {
  return window.QueryInterface(Ci.nsIInterfaceRequestor).
                getInterface(Ci.nsIDOMWindowUtils).currentInnerWindowID;
}

/**
 * TODO:
 */
function getRequestLoadContext(request) {
  try {
    if (request && request.notificationCallbacks) {
      return request.notificationCallbacks.getInterface(Ci.nsILoadContext);
    }
  }
  catch (exc) {
  }

  try {
    if (request && request.loadGroup && 
      request.loadGroup.notificationCallbacks) {
      return request.loadGroup.notificationCallbacks.
        getInterface(Ci.nsILoadContext);
    }
  }
  catch (exc) {
  }

  return null;
}

function getAncestorByTagName(node, tagName) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.localName && parent.tagName.toLowerCase() == tagName)
      return parent;
  }
  return null;
}

// Exports from this module
exports.LoggerActor = LoggerActor;
