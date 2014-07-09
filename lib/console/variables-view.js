/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "Deprecated"
};

var self = require("sdk/self");
var main = require("../main.js");

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");
const { Class } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { DomTree } = require("../dom/domTree.js");
const { DomProvider } = require("../dom/domProvider.js");
const { DomCache } = require("../dom/domCache.js");
const { loadSheet } = require("sdk/stylesheet/utils");
const { Reps } = require("../reps/reps.js");
const { Events } = require("../core/events.js");

/**
 * TODO: description
 */
const VariablesView = Class(
/** @lends VariablesView */
{
  extends: EventTarget,

  // Initialization
  initialize: function(options) {
    Trace.sysout("VariablesView.initialize;", options);

    this.objectActor = options.objectActor;
    this.parentNode = options.parentNode;
    this.toolbox = options.toolbox;

    // Apply Firebug theme
    // xxxHonza: we need to go over all the styles and use only what we need.
    // Necessary styles should be collected in domTree.css file.
    let doc = this.parentNode.ownerDocument;
    loadSheet(doc.defaultView, "chrome://firebug/skin/domTree.css", "author");

    // Make sure we are attached to the {@ThreadClient}.
    let target = this.toolbox.target;
    target.activeTab.attachThread({}, this.onAttachThread.bind(this));

    doc.addEventListener("click", this.onPanelClick.bind(this), true);
  },

  onAttachThread: function(response, threadClient) {
    // Create variables view components and render.
    let cache = new DomCache(threadClient);
    let provider = new DomProvider(cache);
    this.tree = new DomTree(provider);

    // Render UI
    this.tree.replace(this.parentNode, { object: this.objectActor });
  },

  // xxxHonza: needs to be shared by all main and side panels.
  onPanelClick: function(event) {
    Trace.sysout("variablesView.onPanelClick;", event);

    var repNode = Reps.getRepNode(event.target);
    if (repNode) {
      var object = repNode.repObject;
      var rep = Reps.getRep(object);
      var realObject = rep ? rep.getRealObject(object) : null;
      var realRep = realObject ? Reps.getRep(realObject) : rep;
      if (!realObject)
        realObject = object;

      if (Events.isLeftClick(event)) {
        if (repNode.classList.contains("objectLink")) {
          if (realRep) {
            let chrome = main.Firebug.getChrome(this.toolbox);
            realRep.inspectObject(realObject, chrome);
            Events.cancelEvent(event);
          }
        }
      }
    }
  }
});

// Exports from this module
exports.VariablesView = VariablesView;
