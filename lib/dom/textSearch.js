/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cc, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

const finder = Cc["@mozilla.org/embedcomp/rangefind;1"].createInstance(Ci.nsIFind);

/**
 * @class Searches for text in a given node.
 *
 * @constructor
 * @param {Node} rootNode Node to search
 * @param {Function} rowFinder results filter. On find this method will be called
 *      with the node containing the matched text as the first parameter. This may
 *      be undefined to return the node as is.
 */
let TextSearch = function(rootNode, rowFinder) {
  let doc = rootNode.ownerDocument;
  let searchRange = null;
  let startPt = null;

  /**
   * Find the first result in the node.
   *
   * @param {String} text Text to search for
   * @param {boolean} reverse true to perform a reverse search
   * @param {boolean} caseSensitive true to perform a case sensitive search
   */
  this.find = function(text, reverse, caseSensitive) {
    this.text = text;

    finder.findBackwards = !!reverse;
    finder.caseSensitive = !!caseSensitive;

    let range = this.range = finder.Find(
      text, searchRange,
      startPt || searchRange,
      searchRange);

    let match = range ?  range.startContainer : null;
    return this.currentNode = (rowFinder && match ? rowFinder(match) : match);
  };

  /**
   * Find the next search result
   *
   * @param {boolean} wrapAround true to wrap the search if the end of range is reached
   * @param {boolean} sameNode true to return multiple results from the same text node
   * @param {boolean} reverse true to search in reverse
   * @param {boolean} caseSensitive true to perform a case sensitive search
   */
  this.findNext = function(wrapAround, sameNode, reverse, caseSensitive) {
    this.wrapped = false;
    startPt = undefined;

    if (sameNode && this.range) {
      startPt = this.range.cloneRange();
      if (reverse) {
        startPt.setEnd(startPt.startContainer, startPt.startOffset);
      } else {
        startPt.setStart(startPt.startContainer, startPt.startOffset+1);
      }
    }

    if (!startPt) {
      var curNode = this.currentNode ? this.currentNode : rootNode;
      startPt = doc.createRange();
      try {
        if (reverse) {
          startPt.setStartBefore(curNode);
        } else {
          startPt.setStartAfter(curNode);
        }
      } catch (err) {
        if (FBTrace.DBG_ERRORS) {
          TraceError.sysout("textSearch.findNext; setStartAfter fails for: " +
            (this.currentNode ? this.currentNode.nodeType : rootNode.nodeType),
            err);
        }

        try {
          startPt.setStart(curNode);
        } catch (err) {
          return;
        }
      }
    }

    var match = startPt && this.find(this.text, reverse, caseSensitive);
    if (!match && wrapAround) {
      this.wrapped = true;
      this.reset();
      return this.find(this.text, reverse, caseSensitive);
    }

    return match;
  };

  /**
   * Resets the instance state to the initial state.
   */
  this.reset = function() {
    searchRange = doc.createRange();
    searchRange.selectNode(rootNode);

    startPt = searchRange;
  };

  this.reset();
};

// Exports from this module
exports.TextSearch = TextSearch;
