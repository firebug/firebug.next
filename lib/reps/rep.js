/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Locale } = require("../core/locale.js");
const { Str } = require("../core/string.js");

const {SPAN, DIV, A} = Domplate;

/**
 * @domplate Basic template used as a base object for rep templates.
 * It's used for templates that represents data entity (string, number,
 * array, etc.)
 */
var Rep = Domplate.domplate(
/** @lends Rep */
{
  className: "",
  inspectable: true,

  supportsObject: function(object, type) {
    return false;
  },

  inspectObject: function(object, chrome) {
    chrome.select(object);
  },

  getRealObject: function(object, context) {
    return object;
  },

  getTitle: function(object) {
    if (!object) {
      TraceError.sysout("Rep.getTitle; ERROR No object provided");
      return "null object";
    }

    try {
      if (object.constructor && typeof(object.constructor) == "function") {
        var ctorName = object.constructor.name;

        // xxxsz: Objects with 'Object' as constructor name should
        // also be shown. See issue 6148.
        if (ctorName)
          return ctorName;
      }
    }
    catch (e) {
      TraceError.sysout("rep.getTitle; EXCEPTION " + e, e);
    }

    // e.g. [object XPCWrappedNative [object foo]]
    var label = Str.safeToString(object);

    const re =/\[object ([^\]]*)/;
    var m = re.exec(label);
    var n = null;
    if (m)
      n = re.exec(m[1]);  // e.g. XPCWrappedNative [object foo

    if (n)
      return n[1];  // e.g. foo
    else
      return m ? m[1] : label;
  },

  showInfoTip: function(infoTip, target, x, y) {
    return false;
  },

  getTooltip: function(object) {
    return null;
  },

  /**
   * Called by chrome.onContextMenu to build the context menu when the
   * underlying object has this rep.
   * See also Panel for a similar function also called by onContextMenu
   * Extensions may monkey patch and chain off this call
   *
   * @param object: the 'realObject', a model value, e.g. a DOM property
   * @param target: the HTML element clicked on.
   * @param context: the context, probably Firebug.currentContext
   * @return an array of menu items.
   */
  getContextMenuItems: function(object, target, context) {
    return [];
  },

  STR: function(name) {
    return Locale.$STR(name);
  },

  cropString: function(text) {
    return Str.cropString(text);
  },

  cropMultipleLines: function(text, limit) {
    return Str.cropMultipleLines(text, limit);
  },

  toLowerCase: function(text) {
    return text ? text.toLowerCase() : text;
  },

  plural: function(n) {
    return n == 1 ? "" : "s";
  }
});

// Common tags

Rep.tags = {};

Rep.tags.OBJECTBOX = SPAN({
    "class": "objectBox objectBox-$className",
    role: "presentation"
});

Rep.tags.OBJECTBLOCK = DIV({
    "class": "objectBox objectBox-$className focusRow subLogRow",
    role: "listitem"
});

Rep.tags.OBJECTLINK = A({
    "class": "objectLink objectLink-$className a11yFocus",
    _repObject: "$object"
});

// Exports
exports.Rep = Rep;
