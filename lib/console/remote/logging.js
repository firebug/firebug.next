/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true */

"use strict";

var main = require("../../main.js");
const self = require("sdk/self");

const { Ci, Cu, Cc } = require("chrome");
const { Http } = require("../../core/http.js");
const { Dom } = require("../../core/dom.js");
const { System } = require("../../core/system.js");
const { Trace, TraceError } = require("../../core/trace.js");//.get(module.id);
const { ConsoleMessage } = require("../console-message.js");
const { LoggerFront } = require("./logger-front.js");
const { defer } = require("sdk/core/promise");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { console } = Cu.import("resource://gre/modules/devtools/Console.jsm", {});
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});

// Calling devtools.require() does not work. For some reasons, the path
// provided will be checked according to the addons-sdk path logic.
const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");

// xxxHonza: Firefox 36+
const { ActorRegistryFront } = System.devtoolsRequire("devtools/server/actors/actor-registry");

const Events = require("sdk/system/events.js");
const base64 = require("sdk/base64");
const tabUtils = require("sdk/tabs/utils");

const loggers = new WeakMap();

// xxxHonza: do not use hard coded baseURL
const loggerModuleUri = "resource://firebug-at-software-dot-joehewitt-dot-com/" +
  "lib/console/remote/logger-actor.js";

/**
 * TODO: description
 */
var RemoteLogging =
/** @lends RemoteLogging */
{
  // Initialization

  initialize: function(Firebug) {
    Trace.sysout("remoteLogging.initialize;");

    this.onToolboxReady = this.onToolboxReady.bind(this);
    this.onToolboxDestroyed = this.onToolboxDestroyed.bind(this);

    // As soon as the toolbox is ready the 'logger' actor is attached
    // to receive packets about server side logs.
    gDevTools.on("toolbox-ready", this.onToolboxReady);
    gDevTools.on("toolbox-destroy", this.onToolboxDestroyed);

    this.initDeffered = defer();
    return this.initDeffered.promise;
  },

  shutdown: function(Firebug) {
    Trace.sysout("remoteLogging.shutdown;");

    gDevTools.off("toolbox-ready", this.onToolboxReady);
    gDevTools.off("toolbox-destroy", this.onToolboxDestroyed);

    if (this.actorFront) {
      Trace.sysout("remoteLogging.onToolboxDestroyed; unregister " +
        "logger actor", arguments);

      this.actorFront.unregister().then(() => {
        Trace.sysout("remoteLogging.onToolboxDestroyed; logger actor " +
          "unregistered", arguments);
      });
    }
  },

  // Toolbox Events

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("remoteLogging.onToolboxReady; " +
      typeof(ActorRegistryFront), toolbox);

    // Attach to the logger actor.
    let target = toolbox.target;
    target.client.listTabs((response) => {
      Trace.sysout("remoteLogging.onToolboxReady; list tabs", response);

      // The logger actor might be already registered on the backend.
      let currTab = response.tabs[response.selected];
      if (currTab[LoggerFront.prototype.typeName]) {
        Trace.sysout("remoteLogging.onToolboxReady; logger actor " +
          "already registered, so use it", currTab);

        this.attachLogger(target, currTab);
        return;
      }

      // Dynamically register the logger actor.
      this.registerActor(target, response);
    });
  },

  registerActor: function(target, response) {
    Trace.sysout("remoteLogging.registerActor; new way", arguments);

    // Dynamic actor installation using ActorRegistryFront doesn't support
    // e10s yet. Also the registry actor has been introduced in Firefox 36
    if (System.isMultiprocessEnabled()) {
      Trace.sysout("logging.registerActor; ERROR e10s is not " +
        "supported yet");
      this.initDeffered.resolve(false);
      return true;
    }

    // ActorRegistryFront has been introduced in Firefox 36
    if (typeof ActorRegistryFront == "undefined") {
      Trace.sysout("logging.registerActor; ERROR dynamic actor " +
        "registration has been introduced in Firefox 36");
      this.initDeffered.resolve(false);
      return true;
    }

    // Dynamically register an actor on the backend (can be a remote device)
    // The backend needs to set "devtools.debugger.forbid-certified-apps"
    // to false to make this work.
    // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=977443#c13
    // This will probably change in the future. There should be just one
    // checkbox on the remote device saying "Enable debugging"...

    // The actor is registered as 'tab' actor.
    let options = {
      prefix: "firebugLogger",
      constructor: "LoggerActor",
      type: { tab: true }
    };

    let registry = ActorRegistryFront(target.client, response);
    registry.registerActor(loggerModuleUri, options).then(actorFront => {
      Trace.sysout("remoteLogging.registerActor; logger actor " +
        "registered, actor front:", arguments);

      this.actorFront = actorFront;

      target.client.listTabs(({ tabs, selected }) => {
        Trace.sysout("remoteLogging.registerActor; logger actor list " +
          "tabs 2", arguments);

        this.attachLogger(target, tabs[selected]);
      });
    });
  },

  attachLogger: function(target, form) {
    Trace.sysout("remoteLogging.attachLogger; ", form);

    let logger = LoggerFront(target.client, form);
    return logger.attach().then(() => {
      Trace.sysout("remoteLogging.attachLogger; logger attached",
        arguments);

      loggers.set(target, logger);

      this.initDeffered.resolve(true);
    });
  },

  onToolboxDestroyed: function(eventId, target) {
    Trace.sysout("remoteLogging.onToolboxDestroyed;", target);

    // xxxHonza: We don't have to detach explicitly when the toolbox
    // is closed. The frameworks will automatically call 'disconnect'
    // on the actor when the connection is closed.
    // However we should detach the actor when server side logging is
    // of and attach again when it's on. FIXME
    /*let logger = loggers.get(target);
    logger.detach().then(() => {
      Trace.sysout("remoteLogging.onToolboxDestroyed; logger detached ",
        arguments);
    });*/
  }
};

// Helpers

// Registration
main.target.on("initialize", RemoteLogging.initialize.bind(RemoteLogging));
main.target.on("shutdown", RemoteLogging.shutdown.bind(RemoteLogging));

// Exports from this module
exports.RemoteLogging = RemoteLogging;
