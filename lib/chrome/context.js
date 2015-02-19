/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { defer } = require("sdk/core/promise");
const { DomCache } = require("../dom/dom-cache.js");
const { Obj } = require("../core/object.js");
const { Url } = require("../core/url.js");

/**
 * This object represents a context that is responsible for collecting
 * data about the current target (e.g. a web page). You can see this
 * object as a Document (see Document-View design pattern).
 */
const Context = Class(
/** @lends Context */
{
  extends: EventTarget,

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    this.chrome = options.chrome;
    this.toolbox = options.chrome.toolbox;
    this.target = this.toolbox.target;
    this.url = this.target.url;
    this.id = Obj.getUniqueId();

    Trace.sysout("context.initialize; " + this.getTitle());
  },

  destroy: function() {
    Trace.sysout("context.destroy; " + this.getTitle());
  },

  getTitle: function() {
    return Url.getFileName(this.url);
  },

  getName: function() {
    if (!this.name) {
      if (Url.isDataURL(this.url)) {
        let props = Url.splitDataURL(this.url);
        if (props.fileName) {
          this.name = "data url from " + props.fileName;
        }
      } else {
        this.name = Url.normalizeURL(this.url);
      }
    }

    return this.name;
  },

  getId: function() {
    return this.id;
  },

  getToolbox: function() {
    return this.chrome.toolbox;
  },

  getChrome: function() {
    return this.chrome;
  },

  getBrowserDoc: function() {
    return this.chrome.getBrowserDoc();
  },

  // Cache

  getCache: function() {
    let deferred = defer();

    // Use existing cache if possible.
    if (this.cache) {
      deferred.resolve(this.cache);
      return deferred.promise;
    }

    // Initialize cache.
    let target = this.toolbox.target;
    target.activeTab.attachThread({}, (response, threadClient) => {
      this.cache = new DomCache(threadClient);
      deferred.resolve(this.cache);
    });

    return deferred.promise;
  },

  // Timeouts

  // xxxHonza: all timeouts should be set/cleared through the context
  // that will ensure that there are not timeouts after the context
  // is destroyed (e.g. page navigation event happens)
  setTimeout: function() {
    // TODO
  },

  releaseTimeout: function() {
    // TODO
  }
});

// Exports from this module
exports.Context = Context;
