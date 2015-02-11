/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);

// HTTP Observer

/**
 * @class This object utilizes "@joehewitt.com/firebug-http-observer;1" to watch all requests made
 * by a page (top level window). As soon as the first document "http-on-modify-request" is sent by
 * the top level window, a {@link Firebug.NetExport.PageLoadObserver} object is instantiated (for
 * that window) and all requests/responses forwarded to it.
 */
const HttpObserver = extend(new Firebug.Listener(),
/** @lends HttpObserver */
{
    registered: false,
    pageObservers: [],

    register: function()
    {
        if (this.registered)
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.HttpObserver; HTTP observer already registered!");
          return;
      }

      httpObserver.addObserver(this, "firebug-http-event", false);

      // Register also activity-distributor observer. This one is necessary for
      // catching ACTIVITY_SUBTYPE_TRANSACTION_CLOSE event. In the case of request
      // timeout when none of the http-on-* requests is fired.
      var distributor = this.getActivityDistributor();
      if (distributor)
          distributor.addObserver(this);

      this.registered = true;
  },

  unregister: function()
  {
      if (!this.registered)
      {
          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.HttpObserver; HTTP observer already unregistered!");
          return;
      }

      httpObserver.removeObserver(this, "firebug-http-event");

      var distributor = this.getActivityDistributor();
      if (distributor)
          distributor.removeObserver(this);

      this.registered = false;
  },

  /* nsIObserve */
  observe: function(subject, topic, data)
  {
      try
      {
          if (!(subject instanceof Ci.nsIHttpChannel))
              return;

          // xxxHonza: this is duplication, fix me.
          var win = getWindowForRequest(subject);
          if (!win)
              return;

          var tabId = win ? Firebug.getTabIdForWindow(win) : null;
          if (!tabId)
              return;

          if (topic == "http-on-modify-request")
              this.onModifyRequest(subject, win);
          else if (topic == "http-on-examine-response" )
              this.onExamineResponse(subject, win);
          else if (topic == "http-on-examine-cached-response")
              this.onExamineResponse(subject, win);
      }
      catch (err)
      {
          if (FBTrace.DBG_ERRORS || FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.observe EXCEPTION", err);
      }
  },

  onModifyRequest: function(request, win)
  {
      var name = request.URI.asciiSpec;
      var origName = request.originalURI.asciiSpec;
      var isRedirect = (name != origName);

      // We need to catch new document load.
      if ((request.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI) &&
          request.loadGroup && request.loadGroup.groupObserver &&
          win == win.parent && !isRedirect)
      {
          // The page observer is always created for the top level window.
          this.addPageObserver(win);
      }

      this.onRequestBegin(request, win);
  },

  onExamineResponse: function(request, win)
  {
      this.onRequestEnd(request, win);
  },

  // Page load observers
  addPageObserver: function(win)
  {
      var observer = this.getPageObserver(win);
      if (observer)
      {
          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.Automation; PAGE OBSERVER DETECTED for: " +
                  safeGetWindowLocation(win));

          // In cases where an existing page is reloaded before the previous load
          // finished, let's export what we have.
          var timeout = Firebug.getPref(prefDomain, "pageLoadedTimeout");
          if (timeout > 0)
              Automation.onPageLoaded(win);
      }

      if (FBTrace.DBG_NETEXPORT)
          FBTrace.sysout("netexport.Automation; PAGE OBSERVER CREATED for: " +
              safeGetWindowLocation(win));

      // Create page load observer. This object knows when to fire the "page loaded" event.
      var observer = new PageLoadObserver(win);
      this.pageObservers.push(observer);
  },

  getPageObserver: function(win)
  {
      for (var i=0; i<this.pageObservers.length; i++)
      {
          var observer = this.pageObservers[i];
          if (win == this.pageObservers[i].window)
              return observer;
      }
  },

  removePageObserver: function(win)
  {
      var pageObserver = this.getPageObserver(win);
      if (!pageObserver)
      {
          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.Automation; ERROR Can't remove page observer for: " +
                  safeGetWindowLocation(win));
          return;
      }

      pageObserver.destroy();
      remove(this.pageObservers, pageObserver);

      if (FBTrace.DBG_NETEXPORT)
          FBTrace.sysout("netexport.Automation; Page load observer removed for: " +
              safeGetWindowLocation(win));
  },

  onRequestBegin: function(request, win)
  {
      win = getRootWindow(win);
      var pageObserver = this.getPageObserver(win);
      if (!pageObserver)
      {
          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.Automation.onRequestBegin; ERROR No page-observer for " +
                  safeGetRequestName(request), this.pageObservers);
          return;
      }

      pageObserver.addRequest(request);
  },

  onRequestEnd: function(request, win)
  {
      win = getRootWindow(win);

      var pageObserver = this.getPageObserver(win);
      if (!pageObserver)
      {
          if (FBTrace.DBG_NETEXPORT)
              FBTrace.sysout("netexport.Automation.onRequestEnd; ERROR No page-observer for " +
                  safeGetRequestName(request), this.pageObservers);
          return;
      }

      pageObserver.removeRequest(request);
  },

  onPageLoaded: function(win)
  {
      dispatch(this.fbListeners, "onPageLoaded", [win]);
  },

  // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
  // nsISupports

  QueryInterface: function(iid)
  {
      if (iid.equals(Ci.nsISupports) ||
          iid.equals(Ci.nsIActivityObserver) ||
          iid.equals(Ci.nsIObserver))
       {
           return this;
       }

      throw Cr.NS_ERROR_NO_INTERFACE;
  },

  // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
  // Activity Distributor.

  getActivityDistributor: function()
  {
      if (!this.activityDistributor)
      {
          try
          {
              var hadClass = Cc["@mozilla.org/network/http-activity-distributor;1"];
              if (!hadClass)
                  return null;

              this.activityDistributor = hadClass.getService(Ci.nsIHttpActivityDistributor);

              if (FBTrace.DBG_NETEXPORT)
                  FBTrace.sysout("netexport.NetHttpActivityObserver; Activity Observer Registered");
          }
          catch (err)
          {
              if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
              {
                  FBTrace.sysout("netexport.NetHttpActivityObserver; " +
                      "Activity Observer EXCEPTION", err);
              }
          }
      }
      return this.activityDistributor;
  },

  /* nsIActivityObserver */
  observeActivity: function(httpChannel, activityType, activitySubtype, timestamp,
      extraSizeData, extraStringData)
  {
      try
      {
          if (httpChannel instanceof Ci.nsIHttpChannel)
              this.observeRequest(httpChannel, activityType, activitySubtype, timestamp,
                  extraSizeData, extraStringData);
      }
      catch (exc)
      {
          FBTrace.sysout("netexport.observeActivity: EXCEPTION "+exc, exc);
      }
  },

  observeRequest: function(httpChannel, activityType, activitySubtype, timestamp,
      extraSizeData, extraStringData)
  {
      var win = getWindowForRequest(httpChannel);
      if (!win)
          return;

      // In case of a request timeout we need this event to see that the
      // transaction has been actually closed (even if none of the "http-on*"
      // events has been received.
      // This code ensures that the request is removed from the list of active
      // requests (and so we can declare "page-loaded" later - if the list is empty.
      if (activityType == Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION &&
          activitySubtype == Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE)
      {
          this.onRequestEnd(httpChannel, win);
      }
  },
}

// Exports from this module
exports.Automation = Automation;
