/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { Url } = require("../core/url.js");
const { Locale } = require("../core/locale.js");
const { Str } = require("../core/string.js");

// Domplate
const { domplate, SPAN } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep
 */
var Func = domplate(Rep,
/** @lends Func */
{
  className: "function",

  tag:
      OBJECTLINK("$object|summarizeFunction"),

  summarizeFunction: function(grip) {
    // xxxHonza: display also arguments, but they are not in the preview.
    return Str.cropString(grip.displayName + "()", 100);
  },

  copySource: function(fn) {
    if (fn && typeof (fn['toSource']) == 'function')
      System.copyToClipboard(fn.toSource());
  },

  monitor: function(context, script, monitored, mode) {
    mode = mode || "monitor";
    if (monitored)
      FunctionMonitor.unmonitorScript(context, script, mode);
    else
      FunctionMonitor.monitorScript(context, script, mode);
  },

  supportsObject: function(grip, type) {
    if (!Reps.isGrip(grip))
      return false;

    return (grip.class == "Function");
  },

  inspectObject: function(fn, context) {
    var sourceLink = Firebug.SourceFile.findSourceForFunction(fn, context);
    if (sourceLink)
      Firebug.chrome.select(sourceLink);

    Trace.sysout("reps.function.inspectObject selected sourceLink is ",
      sourceLink);
  },

  getTooltipForScript: function(script) {
    return Locale.$STRF("Line", [Url.normalizeURL(script.url), script.startLine]);
  },

  getTooltip: function(fn, context) {
    var script = SourceFile.findScriptForFunctionInContext(context, fn);
    if (script)
      return this.getTooltipForScript(script);
    if (fn.toString)
      return fn.toString();
  },

  getTitle: function(fn, context) {
    var name = fn.name ? fn.name : "function";
    return name + "()";
  },

  getContextMenuItems: function(fn, target, context) {
    var ret = [];

    var script = SourceFile.findScriptForFunctionInContext(context, fn);
    if (script) {
      // XXX This should really use Debugger.Object.displayName.
      var name = fn.name || "anonymous";
      ret = ret.concat(this.getScriptContextMenuItems(
        context, script, name), ["-"]);
    }

    ret.push({
      label: "CopySource",
      tooltiptext: "dom.tip.Copy_Source",
      command: Obj.bindFixed(this.copySource, this, fn)
    });

    return ret;
  },

  getScriptContextMenuItems: function(context, script, name) {
    var monitored = FunctionMonitor.isScriptMonitored(context, script, "monitor");
    var hasBreakpoint = FunctionMonitor.isScriptMonitored(context, script, "debug");

    var self = this;
    return [{
      label: Locale.$STRF("ShowCallsInConsole", [name]),
      tooltiptext: Locale.$STRF("dom.tip.Log_Calls_To_Function", [name]),
      nol10n: true,
      type: "checkbox",
      checked: monitored,
      command: function() {
        var checked = this.hasAttribute("checked");
        self.monitor(context, script, !checked, "monitor");
      }
    }, {
      label: Locale.$STR("SetBreakpoint"),
      tooltiptext: Locale.$STRF("dom.tip.setBreakpoint", [name]),
      nol10n: true,
      type: "checkbox",
      checked: hasBreakpoint,
      command: function() {
        var checked = this.hasAttribute("checked");
        self.monitor(context, script, !checked, "debug");
      }
    }];
  },
});

// Registration
Reps.registerRep(Func);

// Exports from this module
exports.Func = Func;
