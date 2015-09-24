/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");

// Firebug SDK
const { createFactories } = require("reps/rep-utils");
const { TreeView } = require("reps/tree-view");
const { Reps } = require("reps/repository");

// XHR Spy
const { Json } = require("../utils/json.js");
const { XhrUtils } = require("../utils/xhr-utils.js");
const { ResponseSizeLimit } = createFactories(require("./response-size-limit.js"));
const { XmlView } = createFactories(require("./xml-view.js"));
const { NetInfoGroupList } = createFactories(require("./net-info-groups.js"));

// Shortcuts
const DOM = React.DOM;

/**
 * This template represents the 'Response' panel and is responsible
 * for rendering HTTP response body.
 */
var ResponseTab = React.createClass({
  displayName: "ResponseTab",

  getInitialState: function() {
    return {
      data: {}
    };
  },

  // Response Types

  isJson: function(content) {
    if (isLongString(content.text)) {
      return false;
    }

    return Json.isJSON(content.mimeType, content.text);
  },

  parseJson: function(file) {
    var content = file.response.content;
    if (isLongString(content.text)) {
      return;
    }

    var jsonString = new String(content.text);
    return Json.parseJSONString(jsonString, "http://" + file.request.url);
  },

  isImage: function(content) {
    if (isLongString(content.text)) {
      return false;
    }

    return XhrUtils.isImage(content.mimeType);
  },

  isXml: function(content) {
    if (isLongString(content.text)) {
      return false;
    }

    return XhrUtils.isHTML(content.mimeType);
  },

  parseXml: function(file) {
    var content = file.response.content;
    if (isLongString(content.text)) {
      return;
    }

    var parser = new DOMParser();
    var doc = parser.parseFromString(content.text, "text/xml");

    var root = doc.documentElement;

    // Error handling
    var nsURI = "http://www.mozilla.org/newlayout/xml/parsererror.xml";
    if (root.namespaceURI == nsURI && root.nodeName == "parsererror") {
      Trace.sysout("ResponseTab.parseXml: ERROR ", {
        value: root.firstChild.nodeValue,
        error: root.lastChild.textContent
      });
      return;
    }

    return doc;
  },

  // Rendering

  renderJson: function(file) {
    var content = file.response.content;
    if (!this.isJson(content)) {
      return;
    }

    var json = this.parseJson(file);
    if (!json) {
      return;
    }

    return {
      content: TreeView({data: json,mode: "tiny"}),
      name: Locale.$STR("xhrSpy.json")
    }
  },

  renderImage: function(file) {
    var content = file.response.content;
    if (!this.isImage(content)) {
      return;
    }

    var dataUri = "data:" + content.mimeType + ";base64," + content.text;
    return {
      content: DOM.img({src: dataUri}),
      name: Locale.$STR("xhrSpy.image")
    }
  },

  renderXml: function(file) {
    var content = file.response.content;
    if (!this.isXml(content)) {
      return;
    }

    var doc = this.parseXml(file);
    if (!doc) {
      return;
    }

    return {
      content: XmlView({object: doc}),
      name: Locale.$STR("xhrSpy.xml")
    }
  },

  /**
   * If full response text is available, let's try to parse and
   * present nicely according to the underlying format.
   */
  renderFormattedResponse: function(file) {
    var content = file.response.content;
    if (typeof content.text == "object") {
      return;
    }

    var group = this.renderJson(file);
    if (group) {
      return group;
    }

    group = this.renderImage(file);
    if (group) {
      return group;
    }

    group = this.renderXml(file);
    if (group) {
      return group;
    }
  },

  renderRawResponse: function(file) {
    var group;
    var content = file.response.content;

    // The response might reached the limit, so check if we are
    // dealing with a long string.
    if (typeof content.text == "object") {
      group = {
        name: Locale.$STR("xhrSpy.rawData"),
        content: DOM.div({},
          content.text.initial,
          ResponseSizeLimit({
            actions: this.props.actions,
            data: content,
            message: Locale.$STR("xhrSpy.responseSizeLimitMessage")
          })
        )
      }
    } else {
      group = {
        name: Locale.$STR("xhrSpy.rawData"),
        content: DOM.div({className: "netInfoResponseContent"},
          content.text
        )
      }
    }

    return group;
  },

  /**
   * The response panel displays two groups:
   *
   * 1) Formatted response (in case of supported format, e.g. JSON, XML, etc.)
   * 2) Raw response data (always displayed if not discarded)
   */
  render: function() {
    var actions = this.props.actions;
    var file = this.props.data;

    // If response bodies are discarded (not collected) let's just
    // display a info message indicating what to do to collect even
    // response bodies.
    if (file.discardResponseBody) {
      return DOM.span({className: "netInfoBodiesDiscarded"},
        Locale.$STR("xhrSpy.responseBodyDiscarded")
      );
    }

    // Response bodies are collected, but not received from the
    // backend yet.
    var content = file.response.content;
    if (!content || !content.text) {
      actions.requestData("responseContent");

      // xxxHonza: localization, real spinner
      return (
        DOM.div({}, "Loading...")
      );
    }

    var groups = [];

    // Try to parse the response for better UI representation.
    var group = this.renderFormattedResponse(file);
    if (group) {
      groups.push(group);
    }

    // The raw response is always rendered.
    groups.push(this.renderRawResponse(file));

    // The raw response is collapsed by default if the nice formatted
    // version is available.
    if (groups.length == 2) {
      groups[1].open = false;
    }

    return (
      DOM.div({className: "responseTabBox"},
        DOM.div({className: "panelContent"},
          NetInfoGroupList({
            groups: groups
          })
        )
      )
    );
  }
});

// Helpers

function isLongString(text) {
  return typeof text == "object";
}

// Exports from this module
exports.ResponseTab = ResponseTab;
});
