/* See license.txt for terms of usage */
/* jshint esnext: true */
/* global require: true, exports: true, module: true */

"use strict";

var main = require("../../main.js");

const { Ci, Cu, Cc } = require("chrome");
const { Http } = require("../../core/http.js");
const { Dom } = require("../../core/dom.js");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { ConsoleMessage } = require("../console-message.js");
const { LoggerFront } = require("./logger-front.js");

const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { console } = Cu.import("resource://gre/modules/devtools/Console.jsm", {});

// Calling devtools.require() does not work. For some reasons, the path
// provided will be checked according to the addons-sdk path logic.
const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");
const { ActorRegistryFront } = devtools["require"]("devtools/server/actors/actor-registry");

const Events = require("sdk/system/events.js");
const base64 = require("sdk/base64");
const tabUtils = require("sdk/tabs/utils");

// TODO support FirePHP
const acceptableLoggerHeaders = ["X-ChromeLogger-Data"];

// Should be removed as soon as the Hack is removed.
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});

const loggers = new WeakMap();

/**
 * TODO: description
 */
var RemoteLogging =
/** @lends RemoteLogging */
{
  // Initialization

  initialize: function(Firebug) {
    Trace.sysout("remoteLogging.register;");

    this.onToolboxReady = this.onToolboxReady.bind(this);
    this.onToolboxDestroyed = this.onToolboxDestroyed.bind(this);

    // As soon as the toolbox is ready the 'logger' actor is attached
    // to receive packets about server side logs.
    gDevTools.on("toolbox-ready", this.onToolboxReady);
    gDevTools.on("toolbox-destroyed", this.onToolboxDestroyed);
  },

  shutdown: function(Firebug) {
    Trace.sysout("remoteLogging.unregister;");

    gDevTools.off("toolbox-ready", this.onToolboxReady);
    gDevTools.off("toolbox-destroyed", this.onToolboxDestroyed);
  },

  // Toolbox Events

  onToolboxReady: function(eventId, toolbox) {
    Trace.sysout("remoteLogging.onToolboxReady;", toolbox);

    // Attach to the logger actor.
    let target = toolbox.target;
    let loggerModuleUri = "resource://firebug-next-at-getfirebug-dot-com/lib/" +
      "console/remote/logger-actor.js";

    target.client.listTabs(({ actorRegistryActor }) => {
      Trace.sysout("remoteLogging.onToolboxReady; list tabs", arguments);

      let registry = ActorRegistryFront(target.client, actorRegistryActor);

      // Dynamically register an actor on the backend (can be a remote device)
      // The backend needs to set "devtools.debugger.forbid-certified-apps"
      // to false to make this work.
      // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=977443#c13
      // This will probably change in the future. There should be just one
      // checkbox on the remote device saying "Enable debugging"...
      registry.registerActor(loggerModuleUri).then(actorFront => {
        Trace.sysout("remoteLogging.onToolboxReady; logger actor " +
          "registered, actor front:", arguments);

        target.client.listTabs(({ tabs, selected }) => {
          Trace.sysout("remoteLogging.onToolboxReady; logger actor list " +
            "tabs 2", arguments);

          let logger = LoggerFront(target.client, tabs[selected]);
          logger.attach().then(() => {
            Trace.sysout("remoteLogging.onToolboxReady; logger attached",
              arguments);

            // xxxHonza: FIX ME
            //loggers.set(target, logger);
          });
        });
      });
    });
  },

  onToolboxDestroyed: function(eventId, target) {
    Trace.sysout("remoteLogging.onToolboxDestroyed;", target);

    // xxxHonza: it's too late now and the actor will be destroyed
    // automatically anyway.
    //let logger = loggers.get(target);
    //logger.detach();
  }
};

// Registration
main.target.on("initialize", RemoteLogging.initialize.bind(RemoteLogging));
main.target.on("shutdown", RemoteLogging.shutdown.bind(RemoteLogging));

// Exports from this module
exports.RemoteLogging = RemoteLogging;
