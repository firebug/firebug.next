/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Locale } = require("../../core/locale.js");
const { Str } = require("../../core/string.js");
const { StrEx } = require("../../core/string-ex.js");
const { Class } = require("sdk/core/heritage");
const { Events } = require("../../core/events.js");
const { Css } = require("../../core/css.js");
const { Dom } = require("../../core/dom.js");
const { Options } = require("../../core/options.js");
const { Win } = require("../../core/window.js");
const { emit } = require("sdk/event/core");
const { NetUtils } = require("./net-utils.js");
const { Url } = require("../../core/url.js");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const { Domplate } = require("../../core/domplate.js");
const { domplate, DIV, TAG, A, TABLE, TBODY, SPAN, TD, TR, FOR, CODE } = Domplate;
const { Rep } = require("../../reps/rep.js");
const { Reps } = require("../../reps/reps.js");
const { NetInfoHeaders } = require("./net-info-headers.js");

/**
 * @domplate Represents posted data within request info (the info, which is visible when
 * a request entry is expanded. This template renders content of the Post tab.
 */
var NetInfoPostData = domplate(Rep,
{
  // application/x-www-form-urlencoded
  paramsTable:
    TABLE({"class": "netInfoPostParamsTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
      TBODY({"role": "list", "aria-label": Locale.$STR("net.label.Parameters")},
        TR({"class": "netInfoPostParamsTitle", "role": "presentation"},
          TD({colspan: 2, "role": "presentation"},
            DIV({"class": "netInfoPostParams"},
              Locale.$STR("net.label.Parameters"),
              SPAN({"class": "netInfoPostContentType"},
                "application/x-www-form-urlencoded"
              ),
              A({"class": "netPostParameterSort", onclick: "$onChangeSort"},
                "$object|getLabel"
              )
            )
          )
        )
      )
    ),

  // multipart/form-data
  partsTable:
    TABLE({"class": "netInfoPostPartsTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
      TBODY({"role": "list", "aria-label": Locale.$STR("net.label.Parts")},
        TR({"class": "netInfoPostPartsTitle", "role": "presentation"},
          TD({colspan: 2, "role":"presentation" },
            DIV({"class": "netInfoPostParams"},
              Locale.$STR("net.label.Parts"),
              SPAN({"class": "netInfoPostContentType"},
                "multipart/form-data"
              )
            )
          )
        )
      )
    ),

  // application/json
  jsonTable:
    TABLE({"class": "netInfoPostJSONTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
      TBODY({"role": "list", "aria-label": Locale.$STR("jsonviewer.tab.JSON")},
        TR({"class": "netInfoPostJSONTitle", "role": "presentation"},
          TD({"role": "presentation" },
            DIV({"class": "netInfoPostParams"},
              Locale.$STR("jsonviewer.tab.JSON")
            )
          )
        ),
        TR(
          TD({"class": "netInfoPostJSONBody"})
        )
      )
    ),

  // application/xml
  xmlTable:
    TABLE({"class": "netInfoPostXMLTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
      TBODY({"role": "list", "aria-label": Locale.$STR("xmlviewer.tab.XML")},
        TR({"class": "netInfoPostXMLTitle", "role": "presentation"},
          TD({"role": "presentation" },
            DIV({"class": "netInfoPostParams"},
              Locale.$STR("xmlviewer.tab.XML")
            )
          )
        ),
        TR(
          TD({"class": "netInfoPostXMLBody"})
        )
      )
    ),

  // image/svg+xml
  svgTable:
    TABLE({"class": "netInfoPostSVGTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
      TBODY({"role": "list", "aria-label": Locale.$STR("svgviewer.tab.SVG")},
        TR({"class": "netInfoPostSVGTitle", "role": "presentation"},
          TD({"role": "presentation" },
            DIV({"class": "netInfoPostParams"},
              Locale.$STR("svgviewer.tab.SVG")
            )
          )
        ),
        TR(
          TD({"class": "netInfoPostSVGBody"})
        )
      )
    ),

  // application/x-woff
  fontTable:
    TABLE({"class": "netInfoPostFontTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
        TBODY({"role": "list", "aria-label": Locale.$STR("fontviewer.tab.Font")},
          TR({"class": "netInfoPostFontTitle", "role": "presentation"},
            TD({"role": "presentation" },
              Locale.$STR("fontviewer.tab.Font")
            )
          ),
          TR(
            TD({"class": "netInfoPostFontBody"})
          )
        )
    ),

  sourceTable:
    TABLE({"class": "netInfoPostSourceTable", cellpadding: 0, cellspacing: 0,
      "role": "presentation"},
      TBODY({"role": "list", "aria-label": Locale.$STR("net.label.Source")},
        TR({"class": "netInfoPostSourceTitle", "role": "presentation"},
          TD({colspan: 2, "role": "presentation"},
            DIV({"class": "netInfoPostSource"},
              Locale.$STR("net.label.Source")
            )
          )
        )
      )
    ),

  sourceBodyTag:
    TR({"role": "presentation"},
      TD({colspan: 2, "role": "presentation"},
        FOR("line", "$param|getParamValueIterator",
          CODE({"class":"focusRow subFocusRow", "role": "listitem"}, "$line")
        )
      )
    ),

  getLabel: function(object)
  {
    return Options.get("netSortPostParameters") ?
      Locale.$STR("netParametersDoNotSort") :
      Locale.$STR("netParametersSortAlphabetically");
  },

  getParamValueIterator: function(param)
  {
    return NetInfoHeaders.getParamValueIterator(param);
  },

  render: function(parentNode, file)
  {
    Dom.clearNode(parentNode);

    var text = NetUtils.getPostText(file, true);
    if (text == undefined)
      return;

    if (NetUtils.isURLEncodedRequest(file))
    {
      var lines = text.split("\n");
      var params = Url.parseURLEncodedText(lines[lines.length-1]);
      if (params)
        this.insertParameters(parentNode, params);
    }

    if (NetUtils.isMultiPartRequest(file))
    {
      var data = this.parseMultiPartText(file);
      if (data)
        this.insertParts(parentNode, data);
    }

    var contentType = NetUtils.findHeader(file.requestHeaders, "content-type");

    // TODO: Trigger an event here instead and register the viewer models as listeners
    /*if (JSONViewerModel.isJSON(contentType, text))
        this.insertJSON(parentNode, file);

    if (XMLViewerModel.isXML(contentType))
        this.insertXML(parentNode, file);

    if (SVGViewerModel.isSVG(contentType))
        this.insertSVG(parentNode, file);

    if (FontViewerModel.isFont(contentType, file.href, text))
        this.insertFont(parentNode, file);*/

    var postText = NetUtils.getPostText(file);

    // Make sure headers are not displayed in the 'source' section.
    postText = Http.removeHeadersFromPostText(file.request, postText);
    postText = NetUtils.formatPostText(postText);
    if (postText)
      this.insertSource(parentNode, postText);
  },

  insertParameters: function(parentNode, params)
  {
    if (!params || !params.length)
      return;

    var paramTable = this.paramsTable.append({object: null}, parentNode);
    var row = paramTable.getElementsByClassName("netInfoPostParamsTitle").item(0);

    NetInfoHeaders.headerDataTag.insertRows({headers: params}, row);
  },

  insertParts: function(parentNode, data)
  {
    if (!data.params || !data.params.length)
      return;

    var partsTable = this.partsTable.append(null, parentNode);
    var row = partsTable.getElementsByClassName("netInfoPostPartsTitle").item(0);

    NetInfoHeaders.headerDataTag.insertRows({headers: data.params}, row);
  },

  insertJSON: function(parentNode, file)
  {
    var text = NetUtils.getPostText(file);
    var data = Json.parseJSONString(text, "http://" + file.request.originalURI.host);
    if (!data)
      return;

    var jsonTable = this.jsonTable.append(null, parentNode);
    var jsonBody = jsonTable.getElementsByClassName("netInfoPostJSONBody").item(0);

    if (!this.toggles)
      this.toggles = new ToggleBranch.ToggleBranch();

    DOMPanel.DirTable.tag.replace(
      {object: data, toggles: this.toggles}, jsonBody);
  },

  insertXML: function(parentNode, file)
  {
    var text = NetUtils.getPostText(file);

    var jsonTable = this.xmlTable.append(null, parentNode);
    var jsonBody = jsonTable.getElementsByClassName("netInfoPostXMLBody").item(0);

    XMLViewerModel.insertXML(jsonBody, text);
  },

  insertSVG: function(parentNode, file)
  {
    var text = NetUtils.getPostText(file);

    var jsonTable = this.svgTable.append(null, parentNode);
    var jsonBody = jsonTable.getElementsByClassName("netInfoPostSVGBody").item(0);

    SVGViewerModel.insertSVG(jsonBody, text);
  },

  insertFont: function(parentNode, file)
  {
    var text = NetUtils.getPostText(file);

    var fontTable = this.fontTable.append(null, parentNode);
    var fontBody = fontTable.getElementsByClassName("netInfoPostFontBody").item(0);

    FontViewerModel.insertFont(fontBody, text);
  },

  insertSource: function(parentNode, text)
  {
    var sourceTable = this.sourceTable.append(null, parentNode);
    var row = sourceTable.getElementsByClassName("netInfoPostSourceTitle").item(0);

    var param = {value: text};
    this.sourceBodyTag.insertRows({param: param}, row);
  },

  parseMultiPartText: function(file)
  {
    var text = NetUtils.getPostText(file);
    if (text == undefined)
      return null;

    FBTrace.sysout("net.parseMultiPartText; boundary: ", text);

    var boundary = text.match(/\s*boundary=\s*(.*)/)[1];

    var divider = "\r\n\r\n";
    var bodyStart = text.indexOf(divider);
    var body = text.substr(bodyStart + divider.length);

    var postData = {};
    postData.mimeType = "multipart/form-data";
    postData.params = [];

    var parts = body.split("--" + boundary);
    for (var i=0; i<parts.length; i++)
    {
      var part = parts[i].split(divider);
      if (part.length != 2)
        continue;

      var m = part[0].match(/\s*name=\"(.*)\"(;|$)/);
      postData.params.push({
        name: (m && m.length > 1) ? m[1] : "",
        value: Str.trim(part[1])
      });
    }

    return postData;
  },

  onChangeSort: function(event)
  {
    // xxxHonza TODO:
      /*var target = event.target;
      var netInfoBox = Dom.getAncestorByClass(target, "netInfoBody");
      var panel = getElementPanel(netInfoBox);
      var file = getRepObject(netInfoBox);
      var postText = netInfoBox.getElementsByClassName("netInfoPostText").item(0);

      Options.togglePref("netSortPostParameters");
      NetInfoPostData.render(postText, file);

      Events.cancelEvent(event);*/
  },
});

// Exports from this module
exports.NetInfoPostData = NetInfoPostData;
