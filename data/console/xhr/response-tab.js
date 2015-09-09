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

  isJson: function(content) {
    return Json.isJSON(content.mimeType, content.text);
  },

  parseJson: function(file) {
    var content = file.response.content;
    var jsonString = new String(content.text);
    return Json.parseJSONString(jsonString, "http://" + file.request.url);
  },

  isImage: function(content) {
    return XhrUtils.isImage(content.mimeType);
  },

  isXml: function(content) {
    return false;
  },

  render: function() {
    var actions = this.props.actions;
    var file = this.props.data;

    if (file.discardResponseBody) {
      return DOM.span({className: "netInfoBodiesDiscarded"},
        Locale.$STR("xhrSpy.responseBodyDiscarded")
      );
    }

    var content = file.response.content;
    if (!content.text) {
      actions.requestData("responseContent");

      // xxxHonza: localization, real spinner
      return (
        DOM.div("Loading...")
      );
    }

    if (this.isImage(content)) {
      if (typeof content.text == "object") {
        // xxxHonza: localization, real spinner
        return (
          DOM.div("Loading image...")
        );
      }

      var dataUri = "data:" + content.mimeType + ";base64," + content.text;
      return (
        DOM.img({src: dataUri})
      )
    }

    if (this.isJson(content)) {
      var json = this.parseJson(file);
      if (json) {
        return TreeView({
          data: json,
          mode: "tiny"
        });
      }
    }

    return (
      DOM.div({className: "ResponseTabBox"},
        DOM.div({className: "panelContent netInfoResponseContent"},
          content.text
        )
      )
    );
  }
});

// Exports from this module
exports.ResponseTab = ResponseTab;
});
