/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

/**
 * @class This object is created for a top level window that is being loaded. All requests
 * are collected in an internal array and removed when proper response is received.
 * As soon as the requests list is empty again, the object waits for specified
 * amount of time (see: extensions.firebug.netexport.pageLoadedTimeout) and if no request
 * is made during this period the page is declared to be loaded.
 * 
 * @param {Object} win The monitored window.
 */
function PageLoadObserver(win)
{
    this.window = win;
    this.requests = [];

    // These must be true in order to declare the window loaded.
    this.loaded = false;
    this.painted = false;
    this.created = false;

    this.registerForWindowLoad();

    // This timeout causes the page to be exported even if it's not fully loaded yet.
    var time = Firebug.getPref(prefDomain, "timeout");
    if (time > 0)
        this.absoluteTimeout = setTimeout(bindFixed(this.onAbsoluteTimeout, this), time);
}

PageLoadObserver.prototype =
/** @lends PageLoadObserver */
{
  // HTTP Requests counter

  addRequest: function(request)
  {
      this.requests.push(request);
      this.resetTimeout();
  },

  removeRequest: function(request)
  {
      remove(this.requests, request);
      this.resetTimeout();
  },

  resetTimeout: function()
  {
      // Remove the current timeout if any.
      if (this.timeout)
      {
          clearTimeout(this.timeout);
          delete this.timeout;
      }

      // 1) The page is not loaded if there are pending requests.
      if (this.requests.length > 0)
          return;

      // 2) The page is not loaded if the 'load' event wasn't fired for the window.
      // Also at least one paint event is required.
      if (!this.loaded || !this.painted)
          return;

      // 3) The page is loaded if there is no new request after specified timeout.
      // extensions.firebug.netexport.pageLoadedTimeout
      // The auto-export is not done if the timeout is set to zero (or less). This
      // is useful in cases where the export is done manually through API exposed
      // to the content.
      var timeout = Firebug.getPref(prefDomain, "pageLoadedTimeout");
      if (timeout > 0)
          this.timeout = setTimeout(bindFixed(this.onPageLoaded, this), timeout);
  },

  // Called after timeout when there is no other request.
  onPageLoaded: function()
  {
      // If no requests appeared, the page is loaded.
      if (this.requests.length == 0)
          //HttpObserver.onPageLoaded(this.window);
  },

  // Absolute timeout used to export pages that never finish loading.
  onAbsoluteTimeout: function()
  {
    if (FBTrace.DBG_NETEXPORT)
      FBTrace.sysout("netexport.onAbsoluteTimeout; Export now!");

    //HttpObserver.onPageLoaded(this.window);
  },

  // Support for window loaded events.

  getBrowserByWindow: function(win)
  {
    var browsers = Firebug.chrome.getBrowsers();
    for (var i = 0; i < browsers.length; ++i)
    {
      var browser = browsers[i];
      if (browser.contentWindow == win)
        return browser;
    }

    return null;
  },

  insertHelperFunctions: function(win)
  {
    Firebug.NetExport.Automation.exposeToContent(win);
  },

  // Wait for all event that must be fired before the window is loaded.
  // Any event is missing?
  // xxxHonza: In case of Firefox 3.7 the new 'content-document-global-created'
  // (bug549539) could be utilized.
  onEvent: function(event)
  {
      if (event.type == "DOMWindowCreated")
      {
          this.insertHelperFunctions(this.window);
          var browser = this.getBrowserByWindow(this.window);
          browser.removeEventListener("DOMWindowCreated", this.onEventHandler, true);
          this.created = true;
      }
      else if (event.type == "load")
      {
          // Ignore iframes
          if (event.target.defaultView != this.window)
              return;

          if (FBTrace.DBG_NETEXPORT)
          {
              FBTrace.sysout("netexport.PageLoadObserver; 'load': " +
                  safeGetWindowLocation(this.window));
          }

          var browser = this.getBrowserByWindow(this.window);
          browser.removeEventListener("load", this.onEventHandler, true);
          this.loaded = true;
      }
      else if (event.type == "MozAfterPaint")
      {
          // Ignore iframes
          if (event.target != this.window)
              return;

          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.PageLoadObserver; 'MozAfterPaint': " +
                  safeGetWindowLocation(this.window));

          var browser = this.getBrowserByWindow(this.window);
          browser.removeEventListener("MozAfterPaint", this.onEventHandler, true);
          this.painted = true;
      }

      // Execute callback after 100ms timeout (the inspector tests need it for now),
      // but this should be set to 0.
      if (this.loaded && this.painted)
      {
          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.PageLoadObserver; window is loaded: " +
                  safeGetWindowLocation(this.window));

          // Are we loaded yet?
          this.resetTimeout();
      }
  },

  registerForWindowLoad: function()
  {
      this.onEventHandler = bind(this.onEvent, this);

      var browser = this.getBrowserByWindow(this.window);
      browser.addEventListener("DOMWindowCreated", this.onEventHandler, true);
      browser.addEventListener("load", this.onEventHandler, true);
      browser.addEventListener("MozAfterPaint", this.onEventHandler, true);
  },

  // Clean up

  destroy: function()
  {
      if (FBTrace.DBG_NETEXPORT)
          FBTrace.sysout("netexport.PageLoadObserver; destroy " + this.window.location);

      try
      {
          clearTimeout(this.absoluteTimeout);
          delete this.absoluteTimeout;

          clearTimeout(this.timeout);
          delete this.timeout;

          var browser = this.getBrowserByWindow(this.window);
          if (!this.created)
              browser.removeEventListener("DOMWindowCreated", this.onEventHandler, true);

          if (!this.loaded)
              browser.removeEventListener("load", this.onEventHandler, true);

          if (!this.painted)
              browser.removeEventListener("MozAfterPaint", this.onEventHandler, true);
      }
      catch (err)
      {
          if (FBTrace.DBG_ERRORS || FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.PageLoadObserver; EXCEPTION", err);
        }
    },
}

// Exports from this module
exports.PageLoadObserver = PageLoadObserver;
