/* See license.txt for terms of usage */

"use strict";

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

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");

// Domplate
const {domplate, TABLE, THEAD, TH, TBODY, TR, TD, DIV, SPAN, FOR, TAG, IFRAME, A, CODE } = Domplate;

/**
 * TODO: docs
 *
 * @param consoleOverlay
 * @param msg
 */
function logXhr(consoleOverlay, log) {
  Trace.sysout("xhr-spy.logXhr;", log);

  let hud = consoleOverlay.panel.hud;
  let toolbox = consoleOverlay.toolbox;
  let target = toolbox.target;
  let context = consoleOverlay.getContext();

  // Create registry of spies (map: netEvent actor id -> XhrSpy object)
  if (!context.spies) {
    context.spies = new Map();
  }

  let response = log.response;
  let spy = context.spies.get(response.actor);
  if (!spy && response.isXHR) {
    spy = new XhrSpy(log);
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
  initialize: function(log) {
    this.log = log;
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

      if (!this.body) {
        let wrapper = this.parentNode.querySelector(".message-body-wrapper");

        try {
          this.body = XhrSpyBodyRep.tag.append({}, wrapper);
        } catch (err) {
          TraceError.sysout("xhrSpy.onToggleBody; ERROR " + err, err);
        }
      }
    } else {
      // xxxHonza: Notify all listeners about closing XHR entry and
      // destroying the body. Any custom tabs should be removed now.

      logRow.setAttribute("aria-expanded", "false");

      this.body.parentNode.removeChild(this.body);
      this.body = null;
    }
  },

  render: function() {
  
  },

  update: function() {
    
  }
});

const XhrSpyBodyRep = domplate(Rep,
{
  tag:
    DIV({"class": "netInfoBody"},
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
        selected: "true",
        onclick: "$onClickTab", "role": "tab",
        view: "Headers"},
        Locale.$STR("xhrspy.headers")
      )
    ),

  infoBodies:
    DIV({"class": "netInfoBodies outerFocusRow"},
      DIV({"class": "netInfoParamsText netInfoText", "role": "tabpanel"}),
      DIV({"class": "netInfoHeadersText netInfoText", "role": "tabpanel",
        selected: "true"})
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

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    nameTag:
      SPAN("$param|getParamName"),

    nameWithTooltipTag:
      SPAN({title: "$param.name"}, "$param|getParamName"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hideParams: function(object) {
      return false;
    },

    getNameTag: function(param)
    {
        return (this.getParamName(param) == param.name) ? this.nameTag : this.nameWithTooltipTag;
    },

    getParamName: function(param)
    {
        var name = param.name;
        var limit = Options.get("netParamNameLimit");
        if (limit <= 0)
            return name;

        if (name.length > limit)
            name = name.substr(0, limit) + "...";
        return name;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hideParams: function(file)
    {
        return !file.urlParams || !file.urlParams.length;
    },

    onClickTab: function(event)
    {
        this.selectTab(event.currentTarget);
    },

    getParamValueIterator: function(param)
    {
        // This value is inserted into CODE element and so, make sure the HTML isn't escaped (1210).
        // This is why the second parameter is true.
        // The CODE (with style white-space:pre) element preserves whitespaces so they are
        // displayed the same, as they come from the server (1194).
        // In case of a long header values of post parameters the value must be wrapped (2105).
        return Str.wrapText(param.value, true);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    selectTabByName: function(netInfoBox, tabName)
    {
        var tab = Dom.getChildByClass(netInfoBox, "netInfoTabs", "netInfo" + tabName + "Tab");
        if (!tab)
            return false;

        this.selectTab(tab);

        return true;
    },

    selectTab: function(tab)
    {
        var netInfoBox = Dom.getAncestorByClass(tab, "netInfoBody");

        var view = tab.getAttribute("view");
        if (netInfoBox.selectedTab)
        {
            netInfoBox.selectedTab.removeAttribute("selected");
            netInfoBox.selectedText.removeAttribute("selected");
            netInfoBox.selectedTab.setAttribute("aria-selected", "false");
        }
        var textBodyName = "netInfo" + view + "Text";

        netInfoBox.selectedTab = tab;
        netInfoBox.selectedText = netInfoBox.getElementsByClassName(textBodyName).item(0);

        netInfoBox.selectedTab.setAttribute("selected", "true");
        netInfoBox.selectedText.setAttribute("selected", "true");
        netInfoBox.selectedTab.setAttribute("aria-selected", "true");

        var file = Firebug.getRepObject(netInfoBox);
        var panel = Firebug.getElementPanel(netInfoBox);
        if (!panel)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("net.selectTab; ERROR no panel");
            return;
        }

        var context = panel.context;
        this.updateInfo(netInfoBox, file, context);
    },

    updateInfo: function(netInfoBox, file, context)
    {
        if (FBTrace.DBG_NET)
            FBTrace.sysout("net.updateInfo; file", file);

        if (!netInfoBox)
        {
            if (FBTrace.DBG_NET || FBTrace.DBG_ERRORS)
                FBTrace.sysout("net.updateInfo; ERROR netInfo == null " + file.href, file);
            return;
        }

        var tab = netInfoBox.selectedTab;
        if (Css.hasClass(tab, "netInfoParamsTab"))
        {
            if (file.urlParams && !netInfoBox.urlParamsPresented)
            {
                netInfoBox.urlParamsPresented = true;
                this.insertHeaderRows(netInfoBox, file.urlParams, "Params");
            }
        }

        if (Css.hasClass(tab, "netInfoHeadersTab"))
        {
            var headersText = netInfoBox.getElementsByClassName("netInfoHeadersText").item(0);

            if (file.responseHeaders && !netInfoBox.responseHeadersPresented)
            {
                netInfoBox.responseHeadersPresented = true;

            }
        }

        //xxxHonza: Notify listeners about update so, content of custom tabs can be updated.
    },


    insertHeaderRows: function(netInfoBox, headers, tableName, rowName)
    {
      return;

        if (!headers.length)
            return;

        var headersTable = netInfoBox.getElementsByClassName("netInfo"+tableName+"Table").item(0);
        var tbody = Dom.getChildByClass(headersTable, "netInfo" + rowName + "Body");
        if (!tbody)
            tbody = headersTable.firstChild;
        var titleRow = Dom.getChildByClass(tbody, "netInfo" + rowName + "Title");

        headers.sort(function(a, b)
        {
            return a.name > b.name ? 1 : -1;
        });

        this.headerDataTag.insertRows({headers: headers}, titleRow ? titleRow : tbody);
        Css.removeClass(titleRow, "collapsed");
    },
});

// Exports from this module
exports.logXhr = logXhr;
