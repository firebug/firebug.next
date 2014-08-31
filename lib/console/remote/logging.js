/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true */

"use strict";

const events = require("sdk/system/events.js");
const { Ci, Cu } = require("chrome");
const { Http } = require("../../core/http.js");
const { Dom } = require("../../core/dom.js");
const { Reps } = require("../../reps/reps.js");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { gDevTools } =
  Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } =
  Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { ConsoleMessage } = require("../console-message.js");

// Calling devtools.require() does not work. For some reasons, the path
// provided will be checked according to the addons-sdk path logic.
const { Messages } = devtools["require"]("devtools/webconsole/console-output");

const base64 = require("sdk/base64");

// TODO support FirePHP
const acceptableLoggerHeaders = ["X-ChromeLogger-Data"];

let RemoteLogging = {
  register: function(win) {
      events.on("http-on-examine-response", this.onExamineResponse);
  },

  unregister: function() {
    events.off("http-on-examine-response", this.onExamineResponse);
  },

  onExamineResponse: function(event) {
    let { subject } = event;
    let parsedMessages = [];

    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);

    let tab = getTabFromHttpChannel(httpChannel);

    if (!tab)
    {
      Trace.sysout("RemoteLogging.onExamineResponse; tab not found, return");
      return;
    }

    httpChannel.visitResponseHeaders((header, value) => {
      if (acceptableLoggerHeaders.indexOf(header) !== -1) {
        let parsedMessage = this.parse(header, value);
        parsedMessages.push(parsedMessage);
      }
    });

    if (!parsedMessages.length)
    {
      Trace.sysout("!!!no messages");
      return;
    }

    Trace.sysout("RemoteLogging.onExamineResponse; logging now!");
    // better variable names for parsedMessages, parsedMessage and msg
    // (probably a little piece of refactoration)
    for (let parsedMessage of parsedMessages) {
      for (let msg of parsedMessage) {
        Trace.sysout("!!!logging [type=" + msg.type + "]", msg.logs);
        this.logMessage(msg, tab);
      }
    }
  },

  logMessage: function(msg, tab) {
    // xxxFlorent: Passing win breaks RDP (and maybe E10S).
    var hud = this.getWebConsole(tab);

    if (!hud) {
      TraceError.sysout("RemoteLogging.logMessage; hud is undefined");
      return;
    }
    Trace.sysout("!!!hud", hud);

    function button(msg) {
      let clicks = 0;
      let elem = msg.document.createElement("button");
      elem.textContent = "click me " + Date.now();
      elem.onclick = function() {
        elem.textContent = "clicks " + (++clicks);
      };
      return elem;
    }

    var msgs = msg.logs.map(msg => new ConsoleMessage(msg));

    let consoleMessage = new Messages.Extended(msgs, {
      location: msg.backtrace,
      severity: msg.type,
      category: "WEBDEV",
    });
    hud.ui.output.addMessage(consoleMessage);
  },

  // xxxFlorent: TODO Reuse Firebug.getToolbox ? but Firebug is undefined...
  getWebConsole: function (tab) {
    // |tab| is the XUL tab for the page you want.
    let target = devtools.TargetFactory.forTab(tab);
    let toolbox = gDevTools.getToolbox(target);
    let panel = toolbox ? toolbox.getPanel("webconsole") : null;
    return panel ? panel.hud : null;
  },

  // TODO parse should invoke the parse method of a dedicated module.
  // Example: 
  parse: function(header, value) {
    Trace.sysout("value = ", value);
    let data = JSON.parse(base64.decode(value));
    let parsedMessage = [];

    let columnMap = this.getColumnMap(data);

    for (let row of data.rows) {
      let backtrace = row[columnMap.get("backtrace")],
        label = row[columnMap.get("label")],
        rawLogs = row[columnMap.get("log")],
        type = row[columnMap.get("type")] || 'log';

      // new version without label
      let new_version = false;
      if (data.columns.indexOf('label') === -1) {
          new_version = true;
      }

      // if this is the old version do some converting
      if (!new_version) {
          let show_label = label && typeof label === "string";

          rawLogs = [rawLogs];

          if (show_label) {
              rawLogs.unshift(label);
          }
      }

      parsedMessage.push({
        logs: rawLogs,
        backtrace: backtrace,
        type: type
      });
    }

    Trace.sysout("RemoteLogging.parse; parsedMessage = ",
      parsedMessage);
    return parsedMessage;
  },

  getColumnMap: function(data) {
    // Source taken from:
    // https://github.com/ccampbell/chromelogger/blob/b1f6e6e5482bbc7ecb874a5768d6b4ebd3f31e2a/log.js#L61-L67
    let columnMap = new Map();
    let columnName;

    for (let key in data.columns) {
      columnName = data.columns[key];
      columnMap.set(columnName, key);
    }

    return columnMap;
  },
};

function getTabFromHttpChannel(httpChannel)
{
  let topFrame = Http.getTopFrameElementForRequest(httpChannel);
  if (!topFrame)
  {
    Trace.sysout("RemoteLogging.getTabFromHttpChannel; topFrame not found");
    return;
  }

  let notificationBox = Dom.getAncestorByTagName(topFrame,
      "xul:notificationbox");

  if (!notificationBox)
  {
    Trace.sysout("RemoteLogging.getTabFromHttpChannel; " +
        "notificationbox not found");
    return;
  }

  let tab = notificationBox.ownerDocument.querySelector(
      `#tabbrowser-tabs [linkedpanel='${notificationBox.id}']`);

  return tab;
}

// Bindings.
RemoteLogging.onExamineResponse =
  RemoteLogging.onExamineResponse.bind(RemoteLogging);

exports.RemoteLogging = RemoteLogging;
