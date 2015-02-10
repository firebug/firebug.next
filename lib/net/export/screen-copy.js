/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { setTimeout, clearTimeout } = require("sdk/timers");

const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * TODO: docs
 */
var ScreenCopy =
/** @lends ScreenCopy */
{
  copyToClipboard: function(panelDoc) {
    var panelNode = panelDoc.documentElement;
    var win = panelDoc.defaultView;

    try
    {
      // Use the current parent window (Firebug can be detached).
      var height = panelNode.scrollHeight;
      var width = panelNode.scrollWidth;

      var canvas = this.getCanvasFromWindow(win, width, height);
      var image = panelDoc.createElementNS(XHTML_NS, "img");
      image.setAttribute("style", "display: none");
      image.setAttribute("id", "screengrab_buffer");
      image.setAttribute("src", canvas.toDataURL("image/png", ""));

      panelNode.appendChild(image);

      // We need the original browser.xul, cmd_copyImageContents command
      // will be executed on it after timeout.
      let browser = getMostRecentBrowserWindow();
      var doc = browser.gBrowser.mCurrentBrowser.contentDocument;
      setTimeout(this.copyImage(image, panelNode, doc), 200);
    }
    catch (err)
    {
      TraceError.sysout("ScreeCopy.copyToClipboard; EXCEPTION " + err, err);
    }
    finally
    {
      panelNode.style["overflow"] = "";
      panelNode.style["position"] = "";
    }
  },

  copyImage : function(image, body, doc) {
    return function ()
    {
      doc.popupNode = image;
      try {
        goDoCommand("cmd_copyImageContents");
      } catch (ex) {
        TraceError.sysout("ScreenCopy.copyImage; " + ex, ex);
      }
      body.removeChild(image);
    };
  },

  getCanvasFromWindow: function(win, width, height) {
    var canvas = this.createCanvas(win, width, height);
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(1, 1);
    ctx.drawWindow(win, 0, 0, width, height, "rgb(255,255,255)");
    ctx.restore();
    return canvas;
  },

  createCanvas: function(win, width, height) {
    var canvas = win.document.createElementNS(XHTML_NS, "canvas");
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
}

function goDoCommand(aCommand)
{
  try {
    let browser = getMostRecentBrowserWindow();
    let currBrowser = browser.gBrowser.mCurrentBrowser;
    let controller = currBrowser.top.document.commandDispatcher.
      getControllerForCommand(aCommand);

    if (controller && controller.isCommandEnabled(aCommand)) {
      controller.doCommand(aCommand);
    }
  }
  catch (e) {
    TraceError.sysout("ScreenCopy.goDoCommand; " + e, e);
  }
}

// Exports from this module
exports.ScreenCopy = ScreenCopy;
