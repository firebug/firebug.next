/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true, StopIteration: true */

"use strict";

const events = require("sdk/system/events.js");
const { Ci } = require("chrome");
const { Http } = require("../../core/http.js");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const base64 = require("sdk/base64");
const tabUtils = require("sdk/tabs/utils");

// TODO support FirePHP
const acceptableLoggerHeaders = ["X-ChromeLogger-Data"];

let RemoteLogging = {
  register: function(win, chromeWin) {
    events.on("http-on-examine-response", this.onExamineResponse);
    this.chromeWin = chromeWin;
  },

  unregister: function() {
    events.off("http-on-examine-response", this.onExamineResponse);
  },

  onExamineResponse: function(event) {
    let { subject } = event;
    let parsedMessages = [];

    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);

    let win = Http.getWindowForRequest(httpChannel);
    if (!win)
      return;

    let tab = tabUtils.getTabForContentWindow(win);

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

    tab.addEventListener("load", () => {
      Trace.sysout("RemoteLogging.onExamineResponse; logging now!");
      tab.removeEventListener("load", onLoad);
      for (let parsedMessage of parsedMessages) {
        for (let {type, logs} of parsedMessage) {
          Trace.sysout("!!!logging [type=" + type + "]", logs);
          win.console[type](...logs);
        }
      }
    });
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

// Bindings.
RemoteLogging.onExamineResponse =
  RemoteLogging.onExamineResponse.bind(RemoteLogging);

exports.RemoteLogging = RemoteLogging;
