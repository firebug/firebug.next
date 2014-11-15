/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);

// Module implementation
let Dom = {};

Dom.clearNode = function(node) {
  node.textContent = "";
};

Dom.getAncestorByClass = function(node, className) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.classList && parent.classList.contains(className)) {
      return parent;
    }
  }
  return null;
};

Dom.getAncestorByTagName = function(node, tagName) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.localName && parent.tagName.toLowerCase() == tagName) {
      return parent;
    }
  }
  return null;
};

/**
 * Centers an element inside a scrollable area
 * @param {Object} element Element to scroll to
 * @param {Object} scrollBox Scrolled element (Must be an ancestor of
 * "element" or null for automatically determining the ancestor)
 * @param {Boolean} notX Specifies whether the element should be
 * centered horizontally
 * @param {Boolean} notY Specifies whether the element should be
 * centered vertically
 */
Dom.scrollIntoCenterView = function(element, scrollBox, notX, notY) {
  Dom.scrollTo(element, scrollBox, notX ? "none" : "centerOrLeft",
    notY ? "none" : "centerOrTop");
};

/**
 * Scrolls an element into view
 * @param {Object} element Element to scroll to
 * @param {Object} scrollBox Scrolled element (Must be an ancestor of
 * "element" or null for automatically determining the ancestor)
 * @param {String} alignmentX Horizontal alignment for the element
 * (valid values: "centerOrLeft", "left", "middle", "right", "none")
 * @param {String} alignmentY Vertical alignment for the element
 * (valid values: "centerOrTop", "top", "middle", "bottom", "none")
 * @param {Boolean} scrollWhenVisible Specifies whether "scrollBox"
 * should be scrolled even when "element" is completely visible
 */
// xxxHonza: fix code style
Dom.scrollTo = function(element, scrollBox, alignmentX, alignmentY,
  scrollWhenVisible) {
  if (!element) {
    return;
  }

  if (!scrollBox) {
    scrollBox = Dom.getOverflowParent(element);
  }

  if (!scrollBox) {
    return;
  }

  var offset = Dom.getAncestorOffset(element, scrollBox);

  if (!alignmentX) {
    alignmentX = "centerOrLeft";
  }

  if (!alignmentY) {
    alignmentY = "centerOrTop";
  }

  if (alignmentY) {
    let topSpace = offset.y - scrollBox.scrollTop;
    let bottomSpace = (scrollBox.scrollTop + scrollBox.clientHeight) -
      (offset.y + element.offsetHeight);

    // Element is vertically not completely visible or scrolling is enforced
    if (topSpace < 0 || bottomSpace < 0 || scrollWhenVisible) {
      switch (alignmentY) {
        case "top":
          scrollBox.scrollTop = offset.y;
          break;

        case "center":
        case "centerOrTop":
          let elementFitsIntoScrollBox =
            element.offsetHeight <= scrollBox.clientHeight;
          let y = elementFitsIntoScrollBox || alignmentY != "centerOrTop" ?
            offset.y - (scrollBox.clientHeight - element.offsetHeight) / 2 :
            offset.y;
          scrollBox.scrollTop = y;
          break;

        case "bottom":
          let y = offset.y + element.offsetHeight - scrollBox.clientHeight;
          scrollBox.scrollTop = y;
          break;
      }
    }
  }

  if (alignmentX) {
    let leftSpace = offset.x - scrollBox.scrollLeft;
    let rightSpace = (scrollBox.scrollLeft + scrollBox.clientWidth) -
      (offset.x + element.clientWidth);

    // Element is horizontally not completely visible or scrolling is enforced
    if (leftSpace < 0 || rightSpace < 0 || scrollWhenVisible) {
      switch (alignmentX) {
        case "left":
          scrollBox.scrollLeft = offset.x;
          break;

        case "center":
        case "centerOrLeft":
          let elementFitsIntoScrollBox =
            element.offsetWidth <= scrollBox.clientWidth;
          let x = elementFitsIntoScrollBox || alignmentX != "centerOrLeft" ?
            offset.x - (scrollBox.clientWidth - element.offsetWidth) / 2 :
            offset.x;
          scrollBox.scrollLeft = x;
          break;

        case "right":
          let x = offset.x + element.offsetWidth - scrollBox.clientWidth;
          scrollBox.scrollLeft = x;
          break;
      }
    }
  }

  Trace.sysout("dom.scrollTo;", element);
};

/**
 * Get the next scrollable ancestor
 * @param {Object} element Element to search the ancestor for
 * @returns {Object} Scrollable ancestor
 */
Dom.getOverflowParent = function(element) {
  for (let scrollParent = element.parentNode; scrollParent;
    scrollParent = scrollParent.offsetParent) {
    if (scrollParent.scrollHeight > scrollParent.offsetHeight) {
      return scrollParent;
    }
  }
};

/**
 * Gets the offset of an element relative to an ancestor
 * @param {Element} elt Element to get the info for
 * @param {Element} ancestor Ancestor element used as origin
 */
Dom.getAncestorOffset = function(elt, ancestor) {
  let offset = { x: 0, y: 0 };
  let offsetParent = elt;
  do {
    offset.x += offsetParent.offsetLeft;
    offset.y += offsetParent.offsetTop;
    offsetParent = offsetParent.offsetParent;
  } while (offsetParent && offsetParent !== ancestor);

  return offset;
};

// Exports from this module
exports.Dom = Dom;
