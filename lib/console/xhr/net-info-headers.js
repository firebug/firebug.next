/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Locale } = require("../../core/locale.js");
const { Str } = require("../../core/string.js");
const { StrEx } = require("../../core/string-ex.js");
const { Rep } = require("../../reps/rep.js");
const { Reps } = require("../../reps/reps.js");
const { Events } = require("../../core/events.js");
const { Css } = require("../../core/css.js");
const { Dom } = require("../../core/dom.js");
const { Options } = require("../../core/options.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const { Domplate, getElementData } = require("../../core/domplate.js");
const { domplate, TABLE, TBODY, TR, TD, DIV, SPAN, FOR, TAG, CODE, PRE } = Domplate;

/**
 * @domplate TODO: docs
 */
const NetInfoHeaders = domplate(Rep,
{
  tag:
    DIV({"class": "netInfoHeadersTable", "role": "tabpanel"},
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netResponseHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoResponseHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
            Locale.$STR("xhrSpy.responseHeaders")
          ),
          SPAN({"class": "netHeadersViewSource response collapsed", onclick: "$onViewSource",
            _sourceDisplayed: false, _rowName: "ResponseHeaders"},
            Locale.$STR("xhrSpy.viewSource")
          )
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoResponseHeadersBody", "role": "list",
            "aria-label": Locale.$STR("xhrSpy.responseHeaders")})
        )
      ),
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netRequestHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoRequestHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
            Locale.$STR("xhrSpy.requestHeaders")),
          SPAN({"class": "netHeadersViewSource request collapsed", onclick: "$onViewSource",
            _sourceDisplayed: false, _rowName: "RequestHeaders"},
            Locale.$STR("xhrSpy.viewSource")
          )
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoRequestHeadersBody", "role": "list",
          "aria-label": Locale.$STR("xhrSpy.requestHeaders")})
        )
      ),
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netCachedHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoCachedResponseHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
            Locale.$STR("xhrSpy.cachedResponseHeaders"))
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoCachedResponseHeadersBody", "role": "list",
            "aria-label": Locale.$STR("xhrSpy.cachedResponseHeaders")})
        )
      ),
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netPostRequestHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoPostRequestHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
          Locale.$STR("xhrSpy.postRequestHeaders"))
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoPostRequestHeadersBody", "role": "list",
            "aria-label": Locale.$STR("xhrSpy.postRequestHeaders")})
        )
      )
    ),

  sourceTag:
    TR({"role": "presentation"},
      TD({colspan: 2, "role": "presentation"},
        PRE({"class": "source"})
      )
    ),

  headerDataTag:
    FOR("param", "$headers",
      TR({"role": "listitem"},
        TD({"class": "netInfoParamName", "role": "presentation"},
          TAG("$param|getNameTag", {
            param: "$param"
          })
        ),
        TD({"class": "netInfoParamValue", "role": "list", "aria-label": "$param.name"},
          FOR("line", "$param|getParamValueIterator",
            CODE({"class": "focusRow subFocusRow", "role": "listitem"}, "$line")
          )
        )
      )
    ),

    nameTag:
      SPAN("$param|getParamName"),

    nameWithTooltipTag:
      SPAN({title: "$param.name"}, "$param|getParamName"),

    // Accessors

    hideParams: function(object) {
      return false;
    },

    getNameTag: function(param) {
      return (this.getParamName(param) == param.name) ?
        this.nameTag : this.nameWithTooltipTag;
    },

    getParamName: function(param) {
      let name = param.name;
      let limit = Options.get("netParamNameLimit");
      if (limit <= 0)
        return name;

      if (name.length > limit)
        name = name.substr(0, limit) + "...";

      return name;
    },

    getParamValueIterator: makeInfallible(function(param) {
      // This value is inserted into CODE element and so, make sure the HTML isn't escaped (1210).
      // This is why the second parameter is true.
      // The CODE (with style white-space:pre) element preserves whitespaces so they are
      // displayed the same, as they come from the server (1194).
      // In case of a long header values of post parameters the value must be wrapped (2105).

      return StrEx.wrapText(param.value, true);
    }),

    // Event Handlers

    toggleHeaderContent: function(event) {
      let target = event.target;
      let headerGroup = Dom.getAncestorByClass(target, "netHeadersGroup");

      Css.toggleClass(headerGroup, "opened");

      if (Css.hasClass(headerGroup, "opened")) {
        headerGroup.setAttribute("aria-expanded", "true");
        Options.set(headerGroup.dataset.pref, true);
      } else {
        headerGroup.setAttribute("aria-expanded", "false");
        Options.set(headerGroup.dataset.pref, false);
      }
    },

    onViewSource: makeInfallible(function(event) {
      let target = event.target;
      let rowName = getElementData(target, "rowName");
      let requestHeaders = (rowName == "RequestHeaders");

      let netInfoBody = Dom.getAncestorByClass(target, "netInfoBody");
      let request = Reps.getRepObject(netInfoBody);

      if (target.sourceDisplayed) {
        let headers = requestHeaders ? request.requestHeaders : request.responseHeaders;
        this.insertHeaderRows(netInfoBody, headers, rowName);
        target.textContent = Locale.$STR("xhrSpy.viewSource");
      } else {
        let source = requestHeaders ? request.requestHeadersText : request.responseHeadersText;
        this.insertSource(netInfoBody, source, rowName);
        target.textContent = Locale.$STR("xhrSpy.prettyPrint");
      }

      target.sourceDisplayed = !target.sourceDisplayed;

      Events.cancelEvent(event);
    }),

    insertSource: function(netInfoBody, source, rowName) {
      let tbody = netInfoBody.getElementsByClassName("netInfo" + rowName + "Body").item(0);
      let node = this.sourceTag.replace({}, tbody);
      let sourceNode = node.getElementsByClassName("source").item(0);
      sourceNode.textContent = source;
    },

    insertHeaderRows: makeInfallible(function(netInfoBody, headers, rowName) {
      let headersTable = netInfoBody.getElementsByClassName("netInfoHeadersTable").item(0);
      let tbody = headersTable.getElementsByClassName("netInfo" + rowName + "Body").item(0);

      Dom.clearNode(tbody);

      if (headers && headers.length) {
        headers.sort(function(a, b) {
          return a.name > b.name ? 1 : -1;
        });

        NetInfoHeaders.headerDataTag.insertRows({headers: headers}, tbody);

        let titleRow = headersTable.getElementsByClassName("netInfo" + rowName + "Title").item(0)
        let parent = Dom.getAncestorByClass(titleRow, "netHeadersGroup");
        Css.removeClass(parent, "collapsed");
      }
    }),

    init: function(parent) {
      let rootNode = this.tag.append({}, parent);

      let netInfoBody = Dom.getAncestorByClass(parent, "netInfoBody");
      let request = Reps.getRepObject(netInfoBody);

      let viewSource;
      let headers = rootNode.getElementsByClassName("netHeadersGroup");

      if (Options.get("netResponseHeadersVisible")) {
        Css.setClass(headers[0], "opened");
      }

      if (Options.get("netRequestHeadersVisible")) {
        Css.setClass(headers[1], "opened");
      }

      if (Options.get("netCachedHeadersVisible")) {
        Css.setClass(headers[2], "opened");
      }

      if (Options.get("netPostRequestHeadersVisible")) {
        Css.setClass(headers[3], "opened");
      }

      viewSource = rootNode.getElementsByClassName("netHeadersViewSource request").item(0);
      if (request.requestHeadersText) {
        Css.removeClass(viewSource, "collapsed");
      }

      viewSource = rootNode.getElementsByClassName("netHeadersViewSource response").item(0);
      if (request.responseHeadersText) {
        Css.removeClass(viewSource, "collapsed");
      }
    },

    renderHeaders: function(parent, headers, rowName) {
      if (!parent.firstChild) {
        this.init(parent);
      }

      this.insertHeaderRows(parent, headers, rowName);
    }
});

// Exports from this module
exports.NetInfoHeaders = NetInfoHeaders;
