/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Xul } = require("../core/xul.js");
const { defer } = require("sdk/core/promise");

Cu.import("resource:///modules/devtools/DOMHelpers.jsm");

const PROMISE_URI = "resource://gre/modules/Promise.jsm";
let { Promise: promise } = Cu.import(PROMISE_URI, {});

/**
 * Monkey patch the toolbox, so it's possible to customize layout
 * of existing panels. There is a new event emitted that allows to
 * move panel's iframe into different location in the DOM tree.
 *
 * A bug needs to be reported to get the API built-in.
 *
 * xxxHonza: bugzilla, FIX ME
 */
let originalLoadTool = devtools.Toolbox.prototype.loadTool;
devtools.Toolbox.prototype.loadTool = function(id) {
    if (id === "inspector" && !this._inspector) {
      return this.initInspector().then(() => {
        return this.loadTool(id);
      });
    }

    let deferred = defer();
    let iframe = this.doc.getElementById("toolbox-panel-iframe-" + id);

    if (iframe) {
      let panel = this._toolPanels.get(id);
      if (panel) {
        deferred.resolve(panel);
      } else {
        this.once(id + "-ready", panel => {
          deferred.resolve(panel);
        });
      }
      return deferred.promise;
    }

    let definition = gDevTools.getToolDefinition(id);
    if (!definition) {
      deferred.reject(new Error("no such tool id "+id));
      return deferred.promise;
    }

    iframe = this.doc.createElement("iframe");
    iframe.className = "toolbox-panel-iframe";
    iframe.id = "toolbox-panel-iframe-" + id;
    iframe.setAttribute("flex", 1);
    iframe.setAttribute("forceOwnRefreshDriver", "");
    iframe.tooltip = "aHTMLTooltip";
    iframe.style.visibility = "hidden";

    // xxxHonza: fire an event that allows extensions to insert
    // the frame at custom location in the DOM.
    gDevTools.emit(id + "-init", this, iframe);

    // If no parent, put the frame into the default location.
    if (!iframe.parentNode) {
      let vbox = this.doc.getElementById("toolbox-panel-" + id);
      vbox.appendChild(iframe);
    }

    let onLoad = () => {
      // Prevent flicker while loading by waiting to make visible until now.
      iframe.style.visibility = "visible";

      let built = definition.build(contentWindow, this);

      // xxxHonza: fire an event that allows extensions to register
      // event listeners to the panel instance. But how to access the
      // panel instance? (e.g. InspectorPanel sets reference to itself
      // to the iframe.contentWindow in the InspectorPanel() ctor). FIX ME
      // xxxHonza: Bug 1036949 - New API: MarkupView customization
      if (contentWindow)
        this.emit(id + "-build", contentWindow.inspector);
      else
        TraceError.sysout("toolboxPatch.loadTool; ERROR window null", iframe);

      promise.resolve(built).then((panel) => {
        this._toolPanels.set(id, panel);
        this.emit(id + "-ready", panel);
        gDevTools.emit(id + "-ready", this, panel);
        deferred.resolve(panel);
      }, console.error);
    };

    iframe.setAttribute("src", definition.url);

    var contentWindow = iframe.contentWindow;

    // Depending on the host, iframe.contentWindow is not always
    // defined at this moment. If it is not defined, we use an
    // event listener on the iframe DOM node. If it's defined,
    // we use the chromeEventHandler. We can't use a listener
    // on the DOM node every time because this won't work
    // if the (xul chrome) iframe is loaded in a content docshell.
    if (contentWindow) {
      let domHelper = new DOMHelpers(contentWindow);
      domHelper.onceDOMReady(onLoad);
    } else {
      let callback = () => {
        iframe.removeEventListener("DOMContentLoaded", callback);
        onLoad();
      }
      iframe.addEventListener("DOMContentLoaded", callback);
    }

    return deferred.promise;
}

function shutdown() {
  devtools.Toolbox.prototype.loadTool = originalLoadTool;
}

exports.shutdown = shutdown;
