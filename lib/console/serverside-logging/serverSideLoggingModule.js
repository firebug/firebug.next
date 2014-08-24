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

var ServerSideLoggingModule = {
  register: function(win, chromeWin) {
    events.on("http-on-examine-response", this.onExamineResponse);
    this.chromeWin = chromeWin;
  },

  unregister: function() {
    events.off("http-on-examine-response", this.onExamineResponse);
  },

  onExamineResponse: function(event) {
    var self = ServerSideLoggingModule;
    var { subject } = event;
    var parsedMessages = [];

    var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);

    var win = Http.getWindowForRequest(httpChannel);
    if (!win)
      return;

    var tab = tabUtils.getTabForContentWindow(win);

    httpChannel.visitResponseHeaders(function(header, value) {
      if (acceptableLoggerHeaders.indexOf(header) !== -1) {
        var parsedMessage = self.parse(header, value);
        parsedMessages.push(parsedMessage);
      }
    });

    if (!parsedMessages.length)
    {
      Trace.sysout("!!!no messages");
      return;
    }

    tab.addEventListener("load", function onLoad() {
      Trace.sysout("ServerSideLoggingModule.onExamineResponse; logging now!");
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
    var data = JSON.parse(base64.decode(value));
    var parsedMessage = [];

    var columnMap = this.getColumnMap(data);

    for (var row of data.rows) {
      var backtrace = row[columnMap.backtrace],
        label = row[columnMap.label],
        rawLogs = row[columnMap.log],
        type = row[columnMap.type] || 'log';

      // new version without label
      var new_version = false;
      if (data.columns.indexOf('label') === -1) {
          new_version = true;
      }

      // if this is the old version do some converting
      if (!new_version) {
          var show_label = label && typeof label === "string";

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

    Trace.sysout("ServerSideLoggingModule.parse; parsedMessage = ",
      parsedMessage);
    return parsedMessage;
  },

  getColumnMap: function(data) {
    // Source taken from:
    // https://github.com/ccampbell/chromelogger/blob/b1f6e6e5482bbc7ecb874a5768d6b4ebd3f31e2a/log.js#L61-L67
    var columnMap = {};
    var columnName;

    for (var key in data.columns) {
      columnName = data.columns[key];
      columnMap[columnName] = key;
    }

    return columnMap;
  },
};

exports.ServerSideLoggingModule = ServerSideLoggingModule;
