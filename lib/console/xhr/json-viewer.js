/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { emit, on, off } = require("sdk/event/core");
const { Class } = require("sdk/core/heritage");
const { target } = require("../../target.js");
const { Json } = require("../../core/json.js");
const { Css } = require("../../core/css.js");
const { Options } = require("../../core/options.js");
const { Str } = require("../../core/string.js");
const { Events } = require("../../core/events.js");
const { Dom } = require("../../core/dom.js");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const { Domplate } = require("../../core/domplate.js");
const { domplate, SPAN, DIV } = Domplate;
const { NetInfoBody } = require("./net-info-body.js");

// List of JSON content types.
const contentTypes = {
  "text/plain": 1,
  "text/javascript": 1,
  "text/x-javascript": 1,
  "text/json": 1,
  "text/x-json": 1,
  "application/json": 1,
  "application/x-json": 1,
  "application/javascript": 1,
  "application/x-javascript": 1,
  "application/json-rpc": 1
};

// Model implementation

/**
 * TODO: docs
 */
var JSONViewerModel =
/** lends JSONViewerModel */
{
  // Initialization

  initialize: function() {
    this.initTabBody = this.initTabBody.bind(this);
    this.updateTabBody = this.updateTabBody.bind(this);

    on(NetInfoBody, "initTabBody", this.initTabBody);
    on(NetInfoBody, "updateTabBody", this.updateTabBody);
  },

  shutdown: function() {
    off(NetInfoBody, "initTabBody", this.initTabBody);
    off(NetInfoBody, "updateTabBody", this.updateTabBody);
  },

  // Context Menu

  initTabBody: makeInfallible(function({netInfoBody, file}) {
    Trace.sysout("jsonviewer.initTabBody", arguments);

    file.getResponseContent().then(text => {
      // Let listeners to parse the JSON.
      emit(JSONViewerModel, "onParseJSON", file);

      // The JSON is still not there, try to parse most common cases.
      if (!file.jsonObject) {
        if (this.isJSON(file.content.mimeType, text)) {
          file.jsonObject = this.parseJSON(file);
        }
      }

      // The jsonObject is created so, the JSON tab can be displayed.
      if (file.jsonObject) {
        NetInfoBody.appendTab(netInfoBody, "JSON",
          Locale.$STR("jsonViewer.tab.JSON"));

        Trace.sysout("jsonviewer.initTabBody; JSON object available " +
          (typeof(file.jsonObject) != "undefined"), file.jsonObject);
      }
    });
  }),

  isJSON: function(contentType, data) {
    // Workaround for JSON responses without proper content type
    // Let's consider all responses starting with "{" as JSON. In the worst
    // case there will be an exception when parsing. This means that no-JSON
    // responses (and post data) (with "{") can be parsed unnecessarily,
    // which represents a little overhead, but this happens only if the request
    // is actually expanded by the user in the UI (Net & Console panels).
    // Do a manual string search instead of checking (data.strip()[0] === "{")
    // to improve performance/memory usage.
    let len = data ? data.length : 0;
    for (let i = 0; i < len; i++) {
      let ch = data.charAt(i);
      if (ch === "{") {
        return true;
      }

      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        continue;
      }

      break;
    }

    if (!contentType) {
      return false;
    }

    contentType = contentType.split(";")[0];
    contentType = Str.trim(contentType);
    return contentTypes[contentType];
  },

  // Update listener for TabView

  updateTabBody: makeInfallible(function({netInfoBody, file}) {
    Trace.sysout("jsonViewer.updateTabBody", arguments);

    let tab = netInfoBody.selectedTab;
    let tabBody = netInfoBody.querySelector(".netInfoJSONText");
    if (!Css.hasClass(tab, "netInfoJSONTab") || tabBody.updated) {
      return;
    }

    tabBody.updated = true;

    let data = {
      type: "renderJson",
      args: {
        json: file.jsonObject,
        parentNode: tabBody
      },
    };

    let win = tabBody.ownerDocument.defaultView;
    let event = new win.MessageEvent("firebug/chrome/message", {
      bubbles: true,
      cancelable: true,
      data: data,
    });

    win.dispatchEvent(event);
  }),

  parseJSON: function(file) {
    let jsonString = new String(file.content.text);
    return Json.parseJSONString(jsonString, "http://" + file.url);
  },
};

// Registration
target.register(JSONViewerModel);

// Exports from this module
exports.JsonViewer = JSONViewerModel;
