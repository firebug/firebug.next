/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { MarkupView } = devtools["require"]("devtools/markupview/markup-view");

// Patching MarkupView
// xxxHonza: Bug 1036949 - New API: MarkupView customization 
let originalTemplate = MarkupView.prototype.template;
MarkupView.prototype.template = function(aName, aDest, aOptions) {
  let node = originalTemplate.apply(this, arguments);
  this._inspector.emit("markupview-render", node, aName, aDest, aOptions);
  return node;
}

