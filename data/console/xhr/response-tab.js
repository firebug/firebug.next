/* See license.txt for terms of usage */

define(function(require, exports, module) {

const React = require("react");

// Firebug SDK
const { createFactories } = require("reps/rep-utils");
const { TreeView } = require("reps/tree-view");
const { Reps } = require("reps/repository");

// XHR Spy
const { Json } = require("./json.js");
const { XhrUtils } = require("./xhr-utils.js");
const { ResponseSizeLimit } = createFactories(require("./response-size-limit.js"));

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

    return false;
  },

  // Rendering

  render: function() {
    var actions = this.props.actions;
    var file = this.props.data;

    if (file.discardResponseBody) {
      return DOM.span({className: "netInfoBodiesDiscarded"},
        Locale.$STR("xhrSpy.responseBodyDiscarded")
      );
    }

    var content = file.response.content;
    if (!content || !content.text) {
      actions.requestData("responseContent");

      // xxxHonza: localization, real spinner
      return (
        DOM.div({}, "Loading...")
      );
    }

    if (this.isImage(content)) {
      if (typeof content.text == "object") {
        // xxxHonza: localization, real spinner
        return (
          DOM.div({}, "Loading image...")
        );
      }

      var dataUri = "data:" + content.mimeType + ";base64," + content.text;
      return (
        DOM.img({src: dataUri})
      )
    }

    var text = content.text;

    if (this.isJson(content)) {
      var json = this.parseJson(file);
      if (json) {
        text = TreeView({
          data: json,
          mode: "tiny"
        });
      }
    }

    // Response limit check (a long string)
    if (typeof content.text == "object") {
      text = DOM.div({},
        text.initial,
        ResponseSizeLimit({
          actions: this.props.actions,
          data: content,
          message: Locale.$STR("xhrSpy.responseSizeLimitMessage")
        })
      );
    }

    return (
      DOM.div({className: "ResponseTabBox"},
        DOM.div({className: "panelContent netInfoResponseContent"},
          text
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
