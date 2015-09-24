/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Add-on SDK
const { Cu } = require("chrome");
const Heritage = require("sdk/core/heritage");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { Dom } = require("firebug.sdk/lib/core/dom.js");
const { Str } = require("firebug.sdk/lib/core/string.js");
const { devtools, safeRequire } = require("firebug.sdk/lib/core/devtools.js");

// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=912121
const { Messages } = safeRequire(devtools,
  "devtools/client/webconsole/console-output",
  "devtools/webconsole/console-output");

// Firebug
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { GripProvider } = require("../dom/grip-provider.js");

// Constants
const Simple = Messages.Simple;

/**
 * This method creates a custom log rendering detailed performance timing
 * info in the Console panel. The timing info is displayed using graphical
 * waterfall diagram (similar to the one used in the Net panel).
 *
 * @param {@ConsoleOverlay} consoleOverlay Console panel overlay.
 * @param {@Messages.JavaScriptEvalOutput} msg The original Message
 * object logged into the {@WebConsole}. This object contains all
 * necessary data including an actor for the {@PerformanceTiming} object.
 */
function logPerformanceTiming(consoleOverlay, msg) {
  Trace.sysout("performanceTiming.logPerformanceTiming;", msg);

  let hud = consoleOverlay.panel.hud;
  let toolbox = consoleOverlay.toolbox;
  let target = toolbox.target;

  // xxxHonza: create a place holder log with a throbber and wait
  // for the grip properties response from the server.
  // Doing the log asynchronously could be too late and some other
  // logs could jump in.

  let grip = msg.response.result;
  let provider = new GripProvider(target);
  provider.getPrototypeAndProperties(grip).then(response => {
    let ownProperties = response.ownProperties;
    let timing = validateTiming(ownProperties);
    let result = calculateTiming(timing);
    let message = new PerformanceTimingMessage(result);
    hud.ui.output.addMessage(message);
  });
}

/**
 * This object represents Console message. Instances of this object
 * are placed directly into {@WebConsole} output queue.
 * The object implements a render methods that is executed automatically
 * by the platform. The method uses {@PerformanceTiming} template to
 * render a graph with timing info.
 */
function PerformanceTimingMessage(msg) {
  this.timing = msg;

  let options = {category: "input", severity: "log"};
  Messages.Simple.call(this, "", options);
};

PerformanceTimingMessage.prototype = Heritage.extend(Simple.prototype,
/** @lends PerformanceTimingMessage */
{
  render: function() {
    let render = Simple.prototype.render.bind(this);

    let element = render().element;
    let messageBody = element.querySelector(".message-body");

    Dom.clearNode(messageBody);

    // Render graphical performance timing info.
    let data = {
      type: "renderTiming",
      args: {
        timing: this.timing,
        parentNode: messageBody
      },
    };

    let win = messageBody.ownerDocument.defaultView;
    let event = new win.MessageEvent("firebug/chrome/message", {
      bubbles: true,
      cancelable: true,
      data: data,
    });

    win.dispatchEvent(event);

    return this;
  },
});

// Helpers

function calculateTiming(timing) {
  let t = timing;
  let elapsed = t.loadEventEnd - t.navigationStart;

  let objects = [];
  let bars = calculateBars(t);

  let result = [];
  for (let i=0; i<bars.length; i++) {
    let bar = bars[i];

    // Filter our empty bars.
    if (!bar.elapsed) {
      continue;
    }

    bar.left = calculatePos(bar.start, elapsed);
    bar.width = calculatePos(bar.elapsed, elapsed);
    bar.label = bar.label + " " + Str.formatTime(bar.elapsed);

    result.push(bar);
  }

  // Events
  let domLoading = calculatePos(t.domLoading - t.navigationStart, elapsed);
  let domInteractive = calculatePos(t.domInteractive - t.navigationStart, elapsed);
  let domContentLoaded = calculatePos(t.domContentLoadedEventStart - t.navigationStart, elapsed);
  let onLoad = calculatePos(t.loadEventStart - t.navigationStart, elapsed);

  for (let i=0; i<result.length; i++) {
    let bar = result[i];
    bar.domLoading = domLoading;
    bar.domInteractive = domInteractive;
    bar.domContentLoaded = domContentLoaded;
    bar.onLoad = onLoad;
  }

  return { bars: result, timing: t }
}

function calculatePos(time, elapsed) {
  return Math.round((time / elapsed) * 100);
}

function calculateBars(timing) {
  let result = [];
  let t = timing;

  // Page Load bar
  result.push({
    className: "pageLoad",
    start: 0,
    elapsed: t.loadEventEnd - t.navigationStart,
    label: Locale.$STR("timing.PageLoad"),
  });

  // Redirect
  result.push({
    className: "redirect",
    start: t.redirectStart ? t.redirectStart - t.navigationStart : 0,
      elapsed: t.redirectStart ? t.redirectEnd - t.redirectStart : 0,
        label: Locale.$STR("timing.Redirect"),
  });

  // DNS
  let dns = t.domainLookupEnd - t.domainLookupStart;
  result.push({
    className: "dns",
    start: t.domainLookupStart - t.navigationStart,
    elapsed: t.domainLookupEnd - t.domainLookupStart,
    label: Locale.$STR("timing.DNS"),
  });

  // Connect bar
  result.push({
    className: "connecting",
    start: t.connectStart - t.navigationStart,
    elapsed: t.connectEnd - t.connectStart,
    label: Locale.$STR("timing.Connecting"),
  });

  // Waiting bar
  result.push({
    className: "waiting",
    start: t.requestStart - t.navigationStart,
    elapsed: t.responseStart - t.requestStart,
    label: Locale.$STR("timing.Waiting"),
  });

  // Response bar
  result.push({
    className: "response",
    start: t.responseStart - t.navigationStart,
    elapsed: t.responseEnd - t.responseStart,
    label: Locale.$STR("timing.Receiving"),
  });

  // Processing bar
  result.push({
    className: "processing",
    start: t.responseEnd - t.navigationStart,
    elapsed: t.loadEventStart - t.responseEnd,
    label: Locale.$STR("timing.DOMProcessing"),
  });

  // DOMContentLoaded
  result.push({
    className: "DOMContentLoaded",
    start: t.domContentLoadedEventStart - t.navigationStart,
    elapsed: t.domContentLoadedEventEnd - t.domContentLoadedEventStart,
    label: Locale.$STR("timing.DOMContentLoaded"),
  });

  // onLoad
  result.push({
    className: "onLoad",
    start: t.loadEventStart - t.navigationStart,
    elapsed: t.loadEventEnd - t.loadEventStart,
    label: Locale.$STR("timing.onLoad"),
  });

  return result;
}

function validateTiming(timing) {
  let result = {};
  for (let p in timing) {
    result[p] = timing[p].getterValue;
  }
  return result;
}

// Exports from this module
exports.logPerformanceTiming = logPerformanceTiming;
