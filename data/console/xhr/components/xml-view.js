/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// ReactJS
const React = require("react");

// Firebug.SDK
const { Reps } = require("reps/reps");
const { createFactories } = require("reps/rep-utils");
const { Attr } = createFactories(require("reps/element"));

// Shortcuts
const { SPAN, DIV } = Reps.DOM;

var XmlView = React.createClass({
  displayName: "XmlView",

  render: function() {
    var doc = this.props.object;

    return CompleteElementFactory({
      object: doc.documentElement
    });
  }
});

/**
 * 
 */
var CompleteElement =
/** @lends CompleteElement */
{
  displayName: "CompleteElement",

  isWhitespaceText: function(node) {
    const reNotWhitespace = /[^\s]/;
    return !reNotWhitespace.exec(node.value);
  },

  attrIterator: function(node) {
    var attrs = [];
    var idAttr, classAttr;

    if (!node.attributes) {
      return attrs;
    }

    for (var i=0; i<node.attributes.length; i++) {
      var attr = node.attributes.item(i);
      if (attr.localName == "id") {
        idAttr = attr;
      } else if (attr.localName == "class") {
        classAttr = attr;
      } else {
        attrs.push(attr);
      }
    };

    // Make sure 'id' and 'class' attributes are displayed first.
    if (classAttr) {
      attrs.splice(0, 0, classAttr);
    }

    if (idAttr) {
      attrs.splice(0, 0, idAttr);
    }

    return attrs.map(attr => Attr({object: attr}));
  },

  childIterator: function(node) {
    if (node.contentDocument) {
      return [node.contentDocument.documentElement];
    }

    var walker = this.props.walker;

    var nodes = [];
    for (var child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType != Node.TEXT_NODE) {
         nodes.push(child);
      }
    }

    return nodes.map(node => getNodeRep(node)({object: node}));
  },

  render: function() {
    var node = this.props.object;
    var hidden = ""; //"nodeHidden"

    var attrs = this.attrIterator(node);
    var children = this.childIterator(node);

    return (
      DIV({className: "nodeBox open " + hidden},
        DIV({className: "nodeLabel"},
          SPAN({className: "nodeLabelBox"},
            "<",
            SPAN({className: "nodeTag"}, node.nodeName),
            attrs,
            SPAN({className: "nodeBracket"}, ">")
          )
        ),
        DIV({className: "nodeChildBox"},
          children
        ),
        DIV({className: "nodeCloseLabel"},
          "</",
          SPAN({className: "nodeTag"}, node.nodeName),
          ">"
        )
      )
    )
  }
};

/**
 * 
 */
var TextElement = Reps.extend(CompleteElement,
{
  displayName: "TextElement",

  render: function() {
    var hidden = ""; //"nodeHidden"
    var node = this.props.object;

    var attrs = this.attrIterator(node);

    return (
      DIV({className: "nodeBox textNodeBox " + hidden},
        DIV({className: "nodeLabel"},
          SPAN({className: "nodeLabelBox"},
            "<",
            SPAN({className: "nodeTag"}, node.nodeName),
            attrs,
            SPAN({className: "nodeBracket editable insertBefore"},
            ">"),
            node.textContent,
            "</",
            SPAN({className: "nodeTag"}, node.nodeName),
            ">"
          )
        )
      )
    )
  }
});

// Helpers

function getNodeRep(node) {
  if (!node.childElementCount) {
    return TextElementFactory;
  }

  return CompleteElementFactory;
}

// Registration

const CompleteElementClass = React.createClass(CompleteElement);
const TextElementClass = React.createClass(TextElement);

const CompleteElementFactory = React.createFactory(CompleteElementClass);
const TextElementFactory = React.createFactory(TextElementClass);

// Exports from this module
exports.XmlView = XmlView;
});
