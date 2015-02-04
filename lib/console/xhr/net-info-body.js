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
const { ResponseSizeLimit } = require("./response-size-limit.js");

/**
 * @rep
 */
const NetInfoBody = domplate(Rep,
{
  tag:
    DIV({"class": "netInfoBody", _repObject: "$object",
      onclick: "$onClickBody"},
      TAG("$infoTabs", {object: "$object"}),
      TAG("$infoBodies", {object: "$object"})
    ),

  infoTabs:
    DIV({"class": "netInfoTabs focusRow subFocusRow", "role": "tablist",
      onclick: "$onClickTab"},
      A({"class": "netInfoParamsTab netInfoTab a11yFocus", "role": "tab",
        $collapsed: "$object|hideParams",
        view: "Params"},
        Locale.$STR("xhrSpy.urlParameters")
      ),
      A({"class": "netInfoHeadersTab netInfoTab a11yFocus", "role": "tab",
        view: "Headers"},
        Locale.$STR("xhrSpy.headers")
      ),
      A({"class": "netInfoResponseTab netInfoTab a11yFocus", "role": "tab",
        $collapsed: "$object|hideResponse",
        view: "Response"},
        Locale.$STR("xhrSpy.response")
      )
    ),

  infoBodies:
    DIV({"class": "netInfoBodies outerFocusRow"},
      DIV({"class": "netInfoParamsText netInfoText", "role": "tabpanel"}),
      DIV({"class": "netInfoHeadersText netInfoText", "role": "tabpanel"}),
      DIV({"class": "netInfoResponseText netInfoText", "role": "tabpanel"})
    ),

    hideResponse: function(request) {
      return false;
    },

    hideParams: function(request) {
      return false;//!request.urlParams || !request.urlParams.length;
    },

    // Event Handlers

    onClickBody: function(event) {
      Events.cancelEvent(event);
    },

    onClickTab: function(event) {
      let tab = Dom.getAncestorByClass(event.target, "netInfoTab");
      this.selectTab(tab);
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

      let request = Reps.getRepObject(netInfoBody);
      this.updateInfo(netInfoBody, request);
    },

    // Update

    updateInfo: function(netInfoBody, request) {
      Trace.sysout("netInfoBody.updateInfo; " + request.actorId, request);

      // Update content of the selected tab.
      let tab = netInfoBody.selectedTab;
      if (tab.classList.contains("netInfoParamsTab")) {
        this.updateParams(netInfoBody, request, tab)
      } else if (tab.classList.contains("netInfoHeadersTab")) {
        this.updateHeaders(netInfoBody, request, tab);
      } else if (tab.classList.contains("netInfoResponseTab")) {
        this.updateResponse(netInfoBody, request, tab);
      }

      //xxxHonza: Notify listeners about update so, content of custom tabs can be updated.
    },

    updateParams: function(netInfoBody, request, tab) {
      if (!netInfoBody.urlParamsPresented) {
        netInfoBody.urlParamsPresented = true;

        // xxxHonza: TODO
        //this.insertHeaderRows(netInfoBody, request.urlParams, "Params");
      }
    },

    /**
     * Render request/response/cached headers
     */
    updateHeaders: function(netInfoBody, request, tab) {
      let client = request.consoleOverlay.getConsoleClient();

      // xxxHonza: caching? Store into the request object?
      client.getRequestHeaders(request.actorId, response => {
        let headersText = netInfoBody.querySelector(".netInfoHeadersText");
        if (!netInfoBody.requestHeadersPresented) {
          netInfoBody.requestHeadersPresented = true;

          NetInfoHeaders.renderHeaders(headersText,
            response.headers, "RequestHeaders");
        }
      });

      // xxxHonza: caching? Store into the request object?
      client.getResponseHeaders(request.actorId, response => {
        let headersText = netInfoBody.querySelector(".netInfoHeadersText");
        if (!netInfoBody.responseHeadersPresented) {
          netInfoBody.responseHeadersPresented = true;

          NetInfoHeaders.renderHeaders(headersText,
            response.headers, "ResponseHeaders");
        }
      });
    },

    updateResponse: function(netInfoBody, request, tab) {
      if (netInfoBody.responsePresented)
        return;

      netInfoBody.responsePresented = true;

      let client = request.consoleOverlay.getConsoleClient();
      client.getResponseContent(request.actorId, response => {
        let responseTextBox = netInfoBody.querySelector(".netInfoResponseText");
        let text = response.content.text;
        let limit = Options.get("netDisplayedResponseLimit") + 15;
        let limitReached = text ? (text.length > limit) : false;
        if (limitReached) {
          text = text.substr(0, limit) + "...";
        }

        // Insert the response into the UI.
        if (text) {
          StrEx.insertWrappedText(text, responseTextBox);
        }
        else {
          StrEx.insertWrappedText("", responseTextBox);
        }

        // Append a message informing the user that the response
        // isn't fully displayed.
        if (limitReached) {
          let object = {
            text: Locale.$STR("xhrSpy.responseSizeLimitMessage"),
            onClickLink: function() {
              openResponseInTab(request);
            }
          };

          ResponseSizeLimit.append(object, responseTextBox);
        }
      });
    },

    // Rendering

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

// Helpers
var openResponseInTab = makeInfallible(request => {
  let response = request.content.text;
  let inputStream = Http.getInputStreamFromString(response);
  let stream = Cc["@mozilla.org/binaryinputstream;1"].
    createInstance(Ci.nsIBinaryInputStream);

  stream.setInputStream(inputStream);

  let encodedResponse = btoa(stream.readBytes(stream.available()));
  let dataUri = "data:" + file.request.contentType + ";base64," + encodedResponse;

  Win.openNewTab(dataUri);
});

// Exports from this module
exports.NetInfoBody = NetInfoBody;
