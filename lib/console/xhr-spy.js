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

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages } = devtools["require"]("devtools/webconsole/console-output");

const Heritage = require("sdk/core/heritage");
const Simple = Messages.Simple;

// Domplate
const {domplate, TABLE, THEAD, TH, TBODY, TR, TD, DIV, SPAN, FOR, TAG} = Domplate;

/**
 * TODO: docs
 *
 * @param consoleOverlay
 * @param msg
 */
function logXhr(consoleOverlay, msg) {
  Trace.sysout("logXHR.logPerformanceTiming;", msg);

  let hud = consoleOverlay.panel.hud;
  let toolbox = consoleOverlay.toolbox;
  let target = toolbox.target;

  let context = consoleOverlay.getContext();

  // Get the current thread actor and render the object structure.
  context.getCache().then(cache => {
    let grip = msg.response.result;

    cache.getPrototypeAndProperties(grip).then(response => {
      let ownProperties = response.ownProperties;
      let timing = validateTiming(ownProperties);
      let result = calculateTiming(timing);
      let message = new XhrMessage(result);
      hud.ui.output.addMessage(message);
    });
  });
}

function XhrMessage(msg) {
  this.xhr = msg;

  let options = {category: "network", severity: "log"};
  Messages.Simple.call(this, "", options);
};

XhrMessage.prototype = Heritage.extend(Simple.prototype,
/** @lends PerformanceTimingMessage */
{
  render: function() {
    let render = Simple.prototype.render.bind(this);

    let element = render().element;
    let messageBody = element.querySelector(".message-body");

    Dom.clearNode(messageBody);

    // Render graphical performance timing info.
    let input = {object: this.xhr};
    let node = XhrSpy.tag.append(input, messageBody);

    return this;
  },
});

/**
 * @domplate Represents a template for XHRs logged in the Console panel.
 * The body of the log (displayed when expanded) is rendered using
 * {@link Firebug.NetMonitor.NetInfoBody}.
 */
const XhrSpy = domplate(Rep,
/** @lends XhrSpy */
{
  tag:
    DIV({"class": "spyHead", _repObject: "$object"},
      TABLE({"class": "spyHeadTable focusRow outerFocusRow", cellpadding: 0, cellspacing: 0,
        "role": "listitem", "aria-expanded": "false"},
        TBODY({"role": "presentation"},
          TR({"class": "spyRow"},
            TD({"class": "spyTitleCol spyCol", onclick: "$onToggleBody"},
              DIV({"class": "spyTitle"},
                "$object|getCaption"
              ),
              DIV({"class": "spyFullTitle spyTitle"},
                "$object|getFullUri"
              )
            ),
            TD({"class": "spyCol"},
              DIV({"class": "spyStatus"}, "$object|getStatus")
            ),
            TD({"class": "spyCol"},
              SPAN({"class": "spyIcon"})
            ),
            TD({"class": "spyCol"},
              SPAN({"class": "spyTime"})
            )/*, xxxHonza: missing source link
            TD({"class": "spyCol"},
              TAG(FirebugReps.SourceLink.tag, {object: "$object.sourceLink"})
            )*/
          )
        )
      )
    ),

  getCaption: function(spy) {
    return spy.method.toUpperCase() + " " + Str.cropString(spy.getURL(), 100);
  },

  getFullUri: function(spy) {
    return spy.method.toUpperCase() + " " + spy.getURL();
  },

  getStatus: function(spy) {
    var text = "";
    if (spy.statusCode)
      text += spy.statusCode + " ";

    if (spy.statusText)
      return text += spy.statusText;

    return text;
  },

  onToggleBody: function(event)
  {
      var target = event.currentTarget;
      var logRow = Dom.getAncestorByClass(target, "logRow-spy");

      if (Events.isLeftClick(event))
      {
          Css.toggleClass(logRow, "opened");

          var spy = logRow.getElementsByClassName("spyHead")[0].repObject;
          var spyHeadTable = Dom.getAncestorByClass(target, "spyHeadTable");

          if (Css.hasClass(logRow, "opened"))
          {
              updateHttpSpyInfo(spy);

              if (spyHeadTable)
                  spyHeadTable.setAttribute("aria-expanded", "true");
          }
          else
          {
              // Notify all listeners about closing XHR entry and destroying the body.
              // Any custom tabs should be removed now.
              var netInfoBox = getInfoBox(spy);
              Events.dispatch(Firebug.NetMonitor.NetInfoBody.fbListeners, "destroyTabBody",
                  [netInfoBox, spy]);

              if (spyHeadTable)
                  spyHeadTable.setAttribute("aria-expanded", "false");

              // Remove the info box, it'll be re-created (together with custom tabs)
              // the next time the XHR entry is opened/updated.
              netInfoBox.parentNode.removeChild(netInfoBox);
          }
      }
  },

  // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

  copyURL: function(spy)
  {
      System.copyToClipboard(spy.getURL());
  },

  copyParams: function(spy)
  {
      var text = spy.postText;
      if (!text)
          return;

      var url = Url.reEncodeURL(spy, text, true);
      System.copyToClipboard(url);
  },

  copyAsCurl: function(spy)
  {
      System.copyToClipboard(NetUtils.generateCurlCommand(spy,
          Options.get("net.curlAddCompressedArgument")));
  },

  copyResponse: function(spy)
  {
      System.copyToClipboard(spy.responseText);
  },

  openInTab: function(spy)
  {
      Win.openNewTab(spy.getURL(), spy.postText);
  },

  resend: function(spy, context)
  {
      try
      {
          if (!context.window)
          {
              TraceError.sysout("spy.resend; ERROR no context");
              return;
          }

          // xxxHonza: must be done through Console RDP
          var win = Wrapper.unwrapObject(context.window);
          var request = new win.XMLHttpRequest();
          request.open(spy.method, spy.href, true);

          var headers = spy.requestHeaders;
          for (var i=0; headers && i<headers.length; i++)
          {
              var header = headers[i];
              request.setRequestHeader(header.name, header.value);
          }

          var postData = NetUtils.getPostText(spy, context, true);
          request.send(postData);
      }
      catch (err)
      {
          TraceError.sysout("spy.resend; EXCEPTION " + err, err);
      }
  },

  // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

  supportsObject: function(object, type)
  {
      return object instanceof Firebug.Spy.XMLHttpRequestSpy;
  },

  browseObject: function(spy, context)
  {
      var url = spy.getURL();
      Win.openNewTab(url);
      return true;
  },

  getRealObject: function(spy, context)
  {
      return spy.xhrRequest;
  },

  getContextMenuItems: function(spy, target, context)
  {
      var items = [{
          label: "CopyLocation",
          tooltiptext: "clipboard.tip.Copy_Location",
          id: "fbSpyCopyLocation",
          command: Obj.bindFixed(this.copyURL, this, spy)
      }];

      if (spy.postText)
      {
          items.push({
              label: "CopyLocationParameters",
              tooltiptext: "net.tip.Copy_Location_Parameters",
              command: Obj.bindFixed(this.copyParams, this, spy)
          });
      }

      items.push({
          label: "CopyResponse",
          id: "fbSpyCopyResponse",
          command: Obj.bindFixed(this.copyResponse, this, spy)
      });

      items.push(
          {
              id: "fbCopyAsCurl",
              label: "CopyAsCurl",
              tooltiptext: "net.tip.Copy_as_cURL",
              command: Obj.bindFixed(this.copyAsCurl, this, spy)
          }
      );

      items.push("-");

      items.push({
          label: "OpenInTab",
          tooltiptext: "firebug.tip.Open_In_Tab",
          id: "fbSpyOpenInTab",
          command: Obj.bindFixed(this.openInTab, this, spy)
      });

      items.push({
          label: "Open_Response_In_New_Tab",
          tooltiptext: "net.tip.Open_Response_In_New_Tab",
          id: "fbSpyOpenResponseInTab",
          command: Obj.bindFixed(NetUtils.openResponseInTab, this, spy)
      });

      items.push("-");

      items.push({
          label: "net.label.Resend",
          tooltiptext: "net.tip.Resend",
          id: "fbSpyResend",
          command: Obj.bindFixed(this.resend, this, spy, context)
      });

      return items;
  }
});

// Exports from this module
exports.logXhr = logXhr;
