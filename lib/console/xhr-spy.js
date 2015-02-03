/* See license.txt for terms of usage */

"use strict";

// xxxHonza TODO:
// 1. split into more files?
// 2. Properly format the code

module.metadata = {
  "stability": "experimental"
};

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Locale } = require("../core/locale.js");
const { Str } = require("../core/string.js");
const { Rep } = require("../reps/rep.js");
const { Reps } = require("../reps/reps.js");
const { Class } = require("sdk/core/heritage");
const { Events } = require("../core/events.js");
const { Css } = require("../core/css.js");
const { Dom } = require("../core/dom.js");
const { Options } = require("../core/options.js");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const {domplate, TABLE, THEAD, TH, TBODY, TR, TD, DIV, SPAN, FOR,
  TAG, IFRAME, A, CODE, PRE } = Domplate;

/**
 * TODO: docs
 *
 * @param consoleOverlay
 * @param msg
 */
function logXhr(consoleOverlay, log) {
  Trace.sysout("xhr-spy.logXhr;", log);

  let context = consoleOverlay.getContext();

  // Create registry of spies (map: netEvent actor id -> XhrSpy object)
  if (!context.spies) {
    context.spies = new Map();
  }

  let response = log.response;
  let spy = context.spies.get(response.actor);
  if (!spy && response.isXHR) {
    spy = new XhrSpy(consoleOverlay, log);
  }

  if (!spy) {
    return false;
  }

  if (log.update) {
    spy.update(response);
  }

  return true;
}

/**
 * TODO: docs
 */
var XhrSpy = Class(
/** @lends XhrSpy */
{
  initialize: function(consoleOverlay, log) {
    Trace.sysout("xhrSpy.initialize; ", log);

    this.consoleOverlay = consoleOverlay;
    this.log = log;
    this.actorId = log.response.actor;
    this.parentNode = log.node;

    // XHR Spy class
    this.parentNode.classList.add("xhrSpy");

    this.parentNode.addEventListener("click", (event) => {
      this.onToggleBody(event);
    });
  },

  onToggleBody: function(event) {
    Trace.sysout("xhrSpy.onToggleBody;", event);

    var target = event.currentTarget;
    var logRow = Dom.getAncestorByClass(target, "xhrSpy");

    if (!Events.isLeftClick(event)) {
      return;
    }

    logRow.classList.toggle("opened");

    if (logRow.classList.contains("opened")) {
      logRow.setAttribute("aria-expanded", "true");

      // Render xhr spy info body.
      if (!this.netInfoBody) {
        this.renderBody();
      }
    } else {
      logRow.setAttribute("aria-expanded", "false");

      this.netInfoBody.parentNode.removeChild(this.netInfoBody);
      this.netInfoBody = null;
    }
  },

  renderBody: makeInfallible(function() {
    let messageBody = this.parentNode.querySelector(".message-body-wrapper");
    this.netInfoBody = NetInfoBody.tag.append({object: this}, messageBody);

    // Select default tab.
    NetInfoBody.selectTabByName(this.netInfoBody, "Headers");
  }),

  update: function() {
    
  }
});

/**
 * @rep
 */
const NetInfoBody = domplate(Rep,
{
  tag:
    DIV({"class": "netInfoBody", _repObject: "$object",
      onclick: "$onClickBody"},
      TAG("$infoTabs", {}),
      TAG("$infoBodies", {})
    ),

  infoTabs:
    DIV({"class": "netInfoTabs focusRow subFocusRow", "role": "tablist"},
      A({"class": "netInfoParamsTab netInfoTab a11yFocus",
        onclick: "$onClickTab", "role": "tab",
        view: "Params"},
        Locale.$STR("xhrspy.urlParameters")
      ),
      A({"class": "netInfoHeadersTab netInfoTab a11yFocus",
        onclick: "$onClickTab", "role": "tab",
        view: "Headers"},
        Locale.$STR("xhrspy.headers")
      )
    ),

  infoBodies:
    DIV({"class": "netInfoBodies outerFocusRow"},
      DIV({"class": "netInfoParamsText netInfoText", "role": "tabpanel"}),
      DIV({"class": "netInfoHeadersText netInfoText", "role": "tabpanel"})
    ),

    hideParams: function(spy) {
      return !spy.urlParams || !spy.urlParams.length;
    },

    // Event Handlers

    onClickBody: function(event) {
      Events.cancelEvent(event);
    },

    onClickTab: function(event) {
      this.selectTab(event.currentTarget);
    },

    selectTabByName: function(netInfoBody, tabName) {
      var tab = netInfoBody.querySelector(".netInfo" + tabName + "Tab");
      if (!tab) {
        return false;
      }

      this.selectTab(tab);
      return true;
    },

    selectTab: function(tab) {
      var netInfoBody = Dom.getAncestorByClass(tab, "netInfoBody");

      var view = tab.getAttribute("view");
      if (netInfoBody.selectedTab) {
        netInfoBody.selectedTab.removeAttribute("selected");
        netInfoBody.selectedText.removeAttribute("selected");
        netInfoBody.selectedTab.setAttribute("aria-selected", "false");
      }

      var textBodyName = "netInfo" + view + "Text";

      netInfoBody.selectedTab = tab;
      netInfoBody.selectedText = netInfoBody.getElementsByClassName(textBodyName).item(0);

      netInfoBody.selectedTab.setAttribute("selected", "true");
      netInfoBody.selectedText.setAttribute("selected", "true");
      netInfoBody.selectedTab.setAttribute("aria-selected", "true");

      let spy = Reps.getRepObject(netInfoBody);
      this.updateInfo(netInfoBody, spy);
    },

    updateInfo: function(netInfoBody, spy) {
      Trace.sysout("NetInfoBody.updateInfo; " + spy.actorId, spy);

      // Render URL parameters
      var tab = netInfoBody.selectedTab;
      if (tab.classList.contains("netInfoParamsTab")) {
        if (!netInfoBody.urlParamsPresented) {
          netInfoBody.urlParamsPresented = true;

          // xxxHonza: TODO
          //this.insertHeaderRows(netInfoBody, spy.urlParams, "Params");
        }
      }

      // Render request/response/cached headers
      if (tab.classList.contains("netInfoHeadersTab")) {
        let client = spy.consoleOverlay.getConsoleClient();

        // xxxHonza: caching? Store into the spy object?
        client.getRequestHeaders(spy.actorId, response => {
          var headersText = netInfoBody.querySelector(".netInfoHeadersText");
          if (!netInfoBody.requestHeadersPresented) {
            netInfoBody.requestHeadersPresented = true;

            NetInfoHeaders.renderHeaders(headersText,
              response.headers, "RequestHeaders");
          }
        });

        // xxxHonza: caching? Store into the spy object?
        client.getResponseHeaders(spy.actorId, response => {
          var headersText = netInfoBody.querySelector(".netInfoHeadersText");
          if (!netInfoBody.responseHeadersPresented) {
            netInfoBody.responseHeadersPresented = true;

            NetInfoHeaders.renderHeaders(headersText,
              response.headers, "ResponseHeaders");
          }
        });

      }

      //xxxHonza: Notify listeners about update so, content of custom tabs can be updated.
    },

    insertHeaderRows: function(netInfoBody, headers, tableName, rowName)
    {
      if (!headers.length)
        return;

      var headersTable = netInfoBody.getElementsByClassName("netInfo"+tableName+"Table").item(0);
      var tbody = Dom.getChildByClass(headersTable, "netInfo" + rowName + "Body");
      if (!tbody)
          tbody = headersTable.firstChild;
      var titleRow = Dom.getChildByClass(tbody, "netInfo" + rowName + "Title");

      headers.sort(function(a, b) {
        return a.name > b.name ? 1 : -1;
      });

      NetInfoHeaders.headerDataTag.insertRows({headers: headers}, titleRow ? titleRow : tbody);
      Css.removeClass(titleRow, "collapsed");
    },
});

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
            Locale.$STR("ResponseHeaders")
          ),
          SPAN({"class": "netHeadersViewSource response collapsed", onclick: "$onViewSource",
            _sourceDisplayed: false, _rowName: "ResponseHeaders"},
            Locale.$STR("net.headers.view source")
          )
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoResponseHeadersBody", "role": "list",
            "aria-label": Locale.$STR("ResponseHeaders")})
        )
      ),
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netRequestHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoRequestHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
            Locale.$STR("RequestHeaders")),
          SPAN({"class": "netHeadersViewSource request collapsed", onclick: "$onViewSource",
            _sourceDisplayed: false, _rowName: "RequestHeaders"},
            Locale.$STR("net.headers.view source")
          )
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoRequestHeadersBody", "role": "list",
          "aria-label": Locale.$STR("RequestHeaders")})
        )
      ),
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netCachedHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoCachedResponseHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
            Locale.$STR("CachedResponseHeaders"))
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoCachedResponseHeadersBody", "role": "list",
            "aria-label": Locale.$STR("CachedResponseHeaders")})
        )
      ),
      DIV({"class": "netHeadersGroup collapsed", "data-pref": "netPostRequestHeadersVisible"},
        DIV({"class": "netInfoHeadersGroup netInfoPostRequestHeadersTitle"},
          SPAN({"class": "netHeader twisty",
            onclick: "$toggleHeaderContent"},
          Locale.$STR("PostRequestHeaders"))
        ),
        TABLE({cellpadding: 0, cellspacing: 0},
          TBODY({"class": "netInfoPostRequestHeadersBody", "role": "list",
            "aria-label": Locale.$STR("PostRequestHeaders")})
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
      var name = param.name;
      var limit = 25;// xxxHonza: Options.get("netParamNameLimit");
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

      // xxxHonza: we need Str.wrapText()
      return [param.value];//Str.wrapText(param.value, true);
    }),

    // Event Handlers

    toggleHeaderContent: function(event)
    {
        var target = event.target;
        var headerGroup = Dom.getAncestorByClass(target, "netHeadersGroup");

        Css.toggleClass(headerGroup, "opened");
        if (Css.hasClass(headerGroup, "opened"))
        {
            headerGroup.setAttribute("aria-expanded", "true");
            Options.set(headerGroup.dataset.pref, true);
        }
        else
        {
            headerGroup.setAttribute("aria-expanded", "false");
            Options.set(headerGroup.dataset.pref, false);
        }
    },

    onViewSource: function(event)
    {
        var target = event.target;
        var requestHeaders = (target.rowName == "RequestHeaders");

        var netInfoBody = Dom.getAncestorByClass(target, "netInfoBody");
        let spy = Reps.getRepObject(netInfoBody);

        if (target.sourceDisplayed)
        {
            var headers = requestHeaders ? spy.requestHeaders : spy.responseHeaders;
            this.insertHeaderRows(netInfoBody, headers, target.rowName);
            target.textContent = Locale.$STR("net.headers.view source");
        }
        else
        {
            var source = requestHeaders ? spy.requestHeadersText : spy.responseHeadersText;
            this.insertSource(netInfoBody, source, target.rowName);
            target.textContent = Locale.$STR("net.headers.pretty print");
        }

        target.sourceDisplayed = !target.sourceDisplayed;

        Events.cancelEvent(event);
    },

    insertSource: function(netInfoBody, source, rowName)
    {
        var tbody = netInfoBody.getElementsByClassName("netInfo" + rowName + "Body").item(0);
        var node = this.sourceTag.replace({}, tbody);
        var sourceNode = node.getElementsByClassName("source").item(0);
        sourceNode.textContent = source;
    },

    insertHeaderRows: function(netInfoBody, headers, rowName)
    {
        var headersTable = netInfoBody.getElementsByClassName("netInfoHeadersTable").item(0);
        var tbody = headersTable.getElementsByClassName("netInfo" + rowName + "Body").item(0);

        Dom.clearNode(tbody);

        if (headers && headers.length)
        {
            headers.sort(function(a, b)
            {
                return a.name > b.name ? 1 : -1;
            });

            NetInfoHeaders.headerDataTag.insertRows({headers: headers}, tbody);

            var titleRow = headersTable.getElementsByClassName("netInfo" + rowName + "Title").item(0)
            var parent = Dom.getAncestorByClass(titleRow, "netHeadersGroup");
            Css.removeClass(parent, "collapsed");
        }
    },

    init: function(parent)
    {
      var rootNode = this.tag.append({}, parent);

      var netInfoBody = Dom.getAncestorByClass(parent, "netInfoBody");
      let spy = Reps.getRepObject(netInfoBody);

      var viewSource;
      var headers = rootNode.getElementsByClassName("netHeadersGroup");

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
      if (spy.requestHeadersText) {
        Css.removeClass(viewSource, "collapsed");
      }

      viewSource = rootNode.getElementsByClassName("netHeadersViewSource response").item(0);
      if (spy.responseHeadersText) {
        Css.removeClass(viewSource, "collapsed");
      }
    },

    renderHeaders: function(parent, headers, rowName) {
      if (!parent.firstChild) {
        this.init(parent);
      }

      try {
        this.insertHeaderRows(parent, headers, rowName);
      } catch (err) {
        FBTrace.sysout("ERROR " + err, err);
      }
    }
});

// Exports from this module
exports.logXhr = logXhr;
