/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Locale } = require("../../core/locale.js");
const { Str } = require("../../core/string.js");
const { Class } = require("sdk/core/heritage");
const { Events } = require("../../core/events.js");
const { Css } = require("../../core/css.js");
const { Dom } = require("../../core/dom.js");
const { Options } = require("../../core/options.js");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Domplate
const { Domplate } = require("../../core/domplate.js");
const { domplate, DIV, TAG, A } = Domplate;
const { Rep } = require("../../reps/rep.js");
const { Reps } = require("../../reps/reps.js");
const { NetInfoHeaders } = require("./net-info-headers.js");

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
        Locale.$STR("xhrSpy.urlParameters")
      ),
      A({"class": "netInfoHeadersTab netInfoTab a11yFocus",
        onclick: "$onClickTab", "role": "tab",
        view: "Headers"},
        Locale.$STR("xhrSpy.headers")
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
      let tab = netInfoBody.querySelector(".netInfo" + tabName + "Tab");
      if (!tab) {
        return false;
      }

      this.selectTab(tab);
      return true;
    },

    selectTab: function(tab) {
      let netInfoBody = Dom.getAncestorByClass(tab, "netInfoBody");

      let view = tab.getAttribute("view");
      if (netInfoBody.selectedTab) {
        netInfoBody.selectedTab.removeAttribute("selected");
        netInfoBody.selectedText.removeAttribute("selected");
        netInfoBody.selectedTab.setAttribute("aria-selected", "false");
      }

      let textBodyName = "netInfo" + view + "Text";

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
      let tab = netInfoBody.selectedTab;
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
          let headersText = netInfoBody.querySelector(".netInfoHeadersText");
          if (!netInfoBody.requestHeadersPresented) {
            netInfoBody.requestHeadersPresented = true;

            NetInfoHeaders.renderHeaders(headersText,
              response.headers, "RequestHeaders");
          }
        });

        // xxxHonza: caching? Store into the spy object?
        client.getResponseHeaders(spy.actorId, response => {
          let headersText = netInfoBody.querySelector(".netInfoHeadersText");
          if (!netInfoBody.responseHeadersPresented) {
            netInfoBody.responseHeadersPresented = true;

            NetInfoHeaders.renderHeaders(headersText,
              response.headers, "ResponseHeaders");
          }
        });

      }

      //xxxHonza: Notify listeners about update so, content of custom tabs can be updated.
    },

    insertHeaderRows: function(netInfoBody, headers, tableName, rowName) {
      if (!headers.length) {
        return;
      }

      let headersTable = netInfoBody.getElementsByClassName("netInfo"+tableName+"Table").item(0);
      let tbody = Dom.getChildByClass(headersTable, "netInfo" + rowName + "Body");
      if (!tbody) {
        tbody = headersTable.firstChild;
      }

      headers.sort(function(a, b) {
        return a.name > b.name ? 1 : -1;
      });

      let titleRow = Dom.getChildByClass(tbody, "netInfo" + rowName + "Title");
      NetInfoHeaders.headerDataTag.insertRows({headers: headers}, titleRow ? titleRow : tbody);
      Css.removeClass(titleRow, "collapsed");
    },
});

// Exports from this module
exports.NetInfoBody = NetInfoBody;
