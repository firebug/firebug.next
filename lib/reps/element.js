/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");
const { Rep } = require("./rep.js");
const { Reps } = require("./reps.js");
const { prefs } = require("sdk/simple-prefs");
const { Locale } = require("../core/locale.js");
const { Str } = require("../core/string.js");
const { Url } = require("../core/url.js");

// Domplate
const { domplate, SPAN, FOR, TAG } = Domplate;
const { OBJECTLINK } = Rep.tags;

/**
 * @rep Generic DOM element template.
 */
var Element = domplate(Rep,
/** @lends Element */
{
  className: "element",

  tag:
    OBJECTLINK(
      "&lt;",
      SPAN({"class": "nodeTag"}, "$object|getLocalName"),
      FOR("attr", "$object|attrIterator",
        "&nbsp;$attr.localName=&quot;",
        SPAN({"class": "nodeValue"}, "$attr|getAttrValue"),
        "&quot;"
      ),
      "&gt;"
     ),

  shortTag:
    OBJECTLINK(
      SPAN({"class": "$object|getVisible"},
        SPAN({"class": "selectorTag"}, "$object|getSelectorTag"),
        SPAN({"class": "selectorId"}, "$object|getSelectorId"),
        SPAN({"class": "selectorClass"}, "$object|getSelectorClasses"),
        TAG("$object|getValueTag", {object: "$object"})
      )
     ),

  // Generic template for various element values
  valueTag:
    SPAN({"class": "selectorValue"}, "$object|getValue"),

  // Template for <input> element with a single value coming from attribute.
  singleInputTag:
    SPAN(
      SPAN("&nbsp;"),
      SPAN({"class": "selectorValue"},
        Locale.$STR("firebug.reps.element.attribute_value") + " = "
      ),
      SPAN({"class": "attributeValue inputValue"},
        TAG(Reps.String.tag, {object: "$object|getValueFromAttribute"})
      )
    ),

  // Template for <input> element with two different values (attribute and property)
  multipleInputTag:
    SPAN(
      SPAN("&nbsp;"),
      SPAN({"class": "selectorValue"},
        Locale.$STR("firebug.reps.element.property_value") + " = "
      ),
      SPAN({"class": "propertyValue inputValue"},
        TAG(Reps.String.tag, {object: "$object|getValueFromProperty"})
      ),
      SPAN("&nbsp;"),
      SPAN({"class": "selectorValue"},
        Locale.$STR("firebug.reps.element.attribute_value") + " = "
      ),
      SPAN({"class": "attributeValue inputValue"},
        TAG(Reps.String.tag, {object: "$object|getValueFromAttribute"})
      )
    ),

  getValueTag: function(elt) {
    // Use proprietary template for <input> elements that can have two
    // different values. One coming from attribute 'value' and one coming
    // from property 'value'.

    //xxxHonza: FIX ME
    /*if (elt instanceof window.HTMLInputElement)
    {
        var attrValue = elt.getAttribute("value");
        var propValue = elt.value;

        if (attrValue != propValue)
            return this.multipleInputTag;
        else
            return this.singleInputTag;
    }*/

    return this.valueTag;
  },

  getValueFromAttribute: function(elt) {
    var limit = Options.get("stringCropLength");
    var value = elt.getAttribute("value");
    return Str.cropString(value, limit);
  },

  getValueFromProperty: function(elt) {
    return Str.cropString(elt.value);
  },

  getValue: function(grip) {
    let preview = grip.preview;
    let value;

    if (grip.class == "HTMLImageElement")
      value = Url.getFileName(preview.attributes["src"]);
    else if (grip.class == "HTMLAnchorElement")
      value = Url.getFileName(preview.attributes["href"]);
    else if (grip.class == "HTMLInputElement")
      value = preview.attributes["value"];
    else if (grip.class == "HTMLFormElement")
      value = Url.getFileName(preview.attributes["action"]);
    else if (grip.class == "HTMLScriptElement")
      value = Url.getFileName(preview.attributes["src"]);

    return value ? " " + Str.cropMultipleLines(value, 20) : " ";
  },

  getLocalName: function(object) {
    return object.preview.nodeName;
  },

  getAttrValue: function(attr) {
    var limit = prefs["displayedAttributeValueLimit"];
    return (limit > 0) ? Str.cropString(attr.value, limit) : attr.value;
  },

  getAttrTitle: function(attr) {
    var newValue = this.getAttrValue(attr);
    return (attr.value != newValue) ? attr.value : undefined;
  },

  getVisible: function(elt) {
    //xxxHonza: FIX ME
    //return Xml.isVisible(elt) ? "" : "selectorHidden";
    return "";
  },

  getSelectorTag: function(elt) {
    return this.getLocalName(elt);
  },

  getSelectorId: function(grip) {
    let preview = grip.preview;
    try {
      let id = preview.attributes["id"];
      return id ? ("#" + id) : "";
    }
    catch (e) {
      return "";
    }
  },

  getSelectorClasses: function(elt) {
    try {
      var selectorClasses = "";
      for (var i=0, len=elt.classList.length; i<len; ++i)
        selectorClasses += "." + elt.classList[i];
      return selectorClasses;
    }
    catch (err) {
      return "";
    }
  },

  // xxxHonza: Used by FireQuery 1.4.1
  getSelectorClass: function(elt) {
    try {
      return elt.classList.length > 0 ? ("." + elt.classList[0]) : "";
    }
    catch (err) {
      return "";
    }
  },

  attrIterator: function(elt) {
    var attrs = [];
    var idAttr, classAttr;
    if (elt.attributes) {
      for (var i = 0; i < elt.attributes.length; ++i) {
        var attr = elt.attributes[i];
        if (attr.localName.indexOf("-moz-math") != -1)
          continue;
        if (attr.localName.indexOf("firebug-") != -1)
          continue;
        else if (attr.localName == "id")
          idAttr = attr;
        else if (attr.localName == "class")
          classAttr = attr;
        else
          attrs.push(attr);
      }
    }

    // Make sure 'id' and 'class' attributes are displayed first.
    if (classAttr)
      attrs.splice(0, 0, classAttr);
    if (idAttr)
      attrs.splice(0, 0, idAttr);

    return attrs;
  },

  shortAttrIterator: function(elt) {
    // Short version returns only 'id' and 'class' attributes.
    var attrs = [];
    if (elt.attributes) {
      for (var i = 0; i < elt.attributes.length; ++i) {
        var attr = elt.attributes[i];
        if (attr.localName == "id" || attr.localName == "class")
          attrs.push(attr);
      }
    }

    return attrs;
  },

  getHidden: function(elt) {
    // xxxHonza: FIX ME
    //return Xml.isVisible(elt) ? "" : "nodeHidden";
  },

  supportsObject: function(object, type) {
    if (type && type.startsWith("HTML"))
      return true;

    return false;
  },

  browseObject: function(elt, context) {
    var tag = elt.localName.toLowerCase();
    if (tag == "script" || tag == "img" || tag == "iframe" || tag == "frame")
      Win.openNewTab(elt.src);
    else if (tag == "link" || tag == "a")
      Win.openNewTab(elt.href);

    return true;
  },

  ignoreTarget: function(target) {
    // XXX: Temporary fix for issue 5577.
    var repNode = target && Firebug.getRepNode(target);
    return (repNode && repNode.classList.contains("cssRule"));
  },

  highlightObject: function(object, context, target) {
    if (this.ignoreTarget(target))
      return;

    Inspector.highlightObject(object, context);
  },

  getTitle: function(grip, context) {
    return getElementCSSSelector(grip);
  },

  getTooltip: function(elt, context, target) {
    // xxxHonza: FIX ME

    /*
    // If the mouse cursor hovers over cropped value of an input element
    // display the full value in the tooltip.
    if (Css.hasClass(target, "objectBox-string"))
    {
        var inputValue = Dom.getAncestorByClass(target, "inputValue");
        if (inputValue)
        {
            var limit = Options.get("stringCropLength");
            var value;
            if (Css.hasClass(inputValue, "attributeValue"))
                value = elt.getAttribute("value");
            else if (Css.hasClass(inputValue, "propertyValue"))
                value = elt.value;

            if (value && value.length > limit)
                return value;
        }
    }*/

    // Don't show a tooltip when hovering an element (see issue 6706)
    return "";
  },
});

// xxxHonza: should be shared lib API (was in css.js)
function getElementCSSSelector(grip)
{
    let preview = grip.preview;
    if (!preview)
      return;

    let label = preview.nodeName;
    let id = preview.attributes["id"];
    if (id)
        label += "#" + id;

    // xxxHonza: we need to instrument the actor to send the class list
    // (or this might be supported natively)
    if (preview.classList) {
      for (var i=0, len=preview.classList.length; i<len; ++i)
        label += "." + preview.classList[i];
    }

    return label;
};

// Registration
Reps.registerRep(Element);

// Exports from this module
exports.Element = Element;
