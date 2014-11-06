/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { prefs } = require("sdk/simple-prefs");
const { Arr } = require("../core/array.js");
const { Locale } = require("../core/locale.js");

// Domplate
const { domplate, SPAN, A, TAG, FOR } = Domplate;
const { OBJECTBOX } = Rep.tags;

/**
 * @rep
 */
var ArrBase = domplate(Reps.Obj,
/** @lends ArrBase */
{
  className: "array",

  toggles: null, // xxxHonza: new ToggleBranch.ToggleBranch(),

  titleTag:
    SPAN({"class": "objectTitle"}, "$object|getTitleTag"),

  getTitle: function(object, context) {
    return "[" + object.length + "]";
  },

  supportsObject: function(object, type) {
    return this.isArray(object);
  },

  longArrayIterator: function(array) {
    return this.arrayIterator(array, 300);
  },

  shortArrayIterator: function(array) {
    return this.arrayIterator(array, prefs["ObjectShortIteratorMax"]);
  },

  arrayIterator: function(grip, max) {
    let items = [];

    if (!grip.preview) {
      return items;
    }

    let array = grip.preview.items;
    for (var i = 0; i < array.length && i <= max; i++) {
      try {
        let delim = (i == array.length-1 ? "" : ", ");
        let value = array[i];

        // Cycle detected
        if (value === array) {
          value = new Reps.ReferenceObj(value);
        }

        let rep = Reps.getRep(value);
        let tag = rep.shortTag || rep.tag;
        items.push({object: value, tag: tag, delim: delim});
      }
      catch (exc) {
        let rep = Reps.getRep(exc);
        let tag = rep.shortTag || rep.tag;

        items.push({object: exc, tag: tag, delim: delim});
      }
    }

    if (array.length > max + 1) {
      items[max] = {
        object: (array.length-max) + " " +
          Locale.$STR("firebug.reps.more") + "...",
        tag: Reps.Caption.tag,
        delim: ""
      };
    }

    return items;
  },

  getItemIndex: function(child) {
    let arrayIndex = 0;
    for (child = child.previousSibling; child; child = child.previousSibling) {
      if (Reps.getRepObject(child)) {
        ++arrayIndex;
      }
    }

    return arrayIndex;
  },

  /**
   * Returns true if the passed object is an array with additional (custom)
   * properties, otherwise returns false. Custom properties should be
   * displayed in extra expandable section.
   *
   * Example array with a custom property.
   * let arr = [0, 1];
   * arr.myProp = "Hello";
   *
   * @param {Array} array The array object.
   */
  hasSpecialProperties: function(array) {
    function isInteger(x) {
      let y = parseInt(x, 10);
      if (isNaN(y)) {
        return false;
      }
      return x === y.toString();
    }

    let n = 0;
    let props = Object.getOwnPropertyNames(array);
    for (var i=0; i<props.length; i++) {
      let p = props[i];

      // Valid indexes are skipped
      if (isInteger(p)) {
        continue;
      }

      // Ignore standard 'length' property, anything else is custom.
      if (p != "length") {
        return true;
      }
    }

    return false;
  },

  onToggleProperties: function(event) {
    let target = event.originalTarget;
    if (target.classList.contains("objectBox-array")) {
      Events.cancelEvent(event);

      target.classList.toggle("opened");

      let propBox = target.getElementsByClassName("arrayProperties").item(0);
      if (target.classList.contains("opened")) {
        let object = Reps.getRepObject(target);
        Firebug.DOMPanel.DirTable.tag.replace(
          {object: object, toggles: this.toggles}, propBox);
      } else {
        Dom.clearNode(propBox);
      }
    }
  },

  highlightObject: function(object, context, target) {
    // Highlighting huge amount of elements on the page can cause
    // serious performance problems (see issue 4736). So, avoid
    // highlighting if the number of elements in
    // the array exceeds specified limit.
    let arr = this.getRealObject(object, context);
    let limit = prefs["multiHighlightLimit"];
    if (!arr || (limit > 0 && arr.length > limit)) {
      if (target.classList.contains("arrayLeftBracket") ||
        target.classList.contains("arrayRightBracket")) {
        let tooltip = Locale.$STRF("console.multiHighlightLimitExceeded",
          [limit]);
        target.setAttribute("title", tooltip);
      }

      // Do not highlight, a tooltip will be displayed instead.
      return;
    }

    target.removeAttribute("title");

    // Highlight multiple elements on the page.
    Inspector.highlightObject(arr, context);
  },

  isArray: function(obj) {
    return false;
  }
});

/**
 * @rep
 */
var ArrNative = domplate(ArrBase,
/** @lends ArrNative */
{
  tag:
    OBJECTBOX({_repObject: "$object",
      $hasTwisty: "$object|hasSpecialProperties",
      onclick: "$onToggleProperties"},
      A({"class": "objectLink", onclick: "$onClickBracket"},
        SPAN({"class": "arrayLeftBracket", role: "presentation"}, "[")
      ),
      FOR("item", "$object|longArrayIterator",
        TAG("$item.tag", {object: "$item.object"}),
        SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
      ),
      A({"class": "objectLink", onclick: "$onClickBracket"},
        SPAN({"class": "arrayRightBracket", role: "presentation"}, "]")
      ),
      SPAN({"class": "arrayProperties", role: "group"})
    ),

  shortTag:
    OBJECTBOX({_repObject: "$object",
      $hasTwisty: "$object|hasSpecialProperties",
      onclick: "$onToggleProperties"},
      A({"class": "objectLink", onclick: "$onClickBracket"},
        SPAN({"class": "arrayLeftBracket", role: "presentation"}, "[")
      ),
      FOR("item", "$object|shortArrayIterator",
        TAG("$item.tag", {object: "$item.object"}),
        SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
      ),
      A({"class": "objectLink", onclick: "$onClickBracket"},
        SPAN({"class": "arrayRightBracket", role: "presentation"}, "]")
      ),
      SPAN({"class": "arrayProperties", role: "group"})
    ),

  onClickBracket: function(event) {
    let obj = Reps.getTargetRepObject(event.target);
    Firebug.chrome.select(obj);
  },

  isArray: function(obj) {
    //Trace.sysout("reps/array.isArray;", obj)
    return Array.isArray(obj) ||
      Object.prototype.toString.call(obj) === "[object Arguments]";
  }
});

/**
 * @rep Any array-ish object that is not directly Array type
 * (e.g. HTMLCollection, NodeList, etc.)
 */
var ArrayLikeObject = domplate(ArrBase,
/** @lends ArrayLikeObject */
{
  tag:
    OBJECTBOX({_repObject: "$object",
      $hasTwisty: "$object|hasSpecialProperties",
      onclick: "$onToggleProperties"},
      A({"class": "objectTitle objectLink", onclick: "$onClickTitle"},
          "$object|getTitle"
      ),
      SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
      FOR("item", "$object|longArrayIterator",
          TAG("$item.tag", {object: "$item.object"}),
          SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
      ),
      SPAN({"class": "arrayRightBracket", role: "presentation"}, "]"),
      SPAN({"class": "arrayProperties", role: "group"})
    ),

  shortTag:
    OBJECTBOX({_repObject: "$object",
      $hasTwisty: "$object|hasSpecialProperties",
      onclick: "$onToggleProperties"},
      A({"class": "objectTitle objectLink", onclick: "$onClickTitle"},
          "$object|getTitle"
      ),
      SPAN({"class": "arrayLeftBracket", role: "presentation"}, "["),
      FOR("item", "$object|shortArrayIterator",
          TAG("$item.tag", {object: "$item.object"}),
          SPAN({"class": "arrayComma", role: "presentation"}, "$item.delim")
      ),
      SPAN({"class": "arrayRightBracket"}, "]"),
      SPAN({"class": "arrayProperties", role: "group"})
    ),

  onClickTitle: function(event) {
    Trace.sysout("onClickTitle;");
    // FIXME
    let obj = Reps.getTargetRepObject(event.target);
    Firebug.chrome.select(obj);
  },

  getTitle: function(grip, context) {
    return grip.class;
  },

  isArray: function(grip) {
    if (!Reps.isGrip(grip)) {
      return;
    }

    let preview = grip.preview;
    if (!preview) {
      return;
    }

    return (grip.preview.kind == "ArrayLike");
  }
});

// Registration
Reps.registerRep(ArrNative);
Reps.registerRep(ArrayLikeObject);

// Exports from this module
exports.ArrBase = ArrNative;
exports.Arr = ArrNative;
exports.ArrayLikeObject = ArrayLikeObject;
