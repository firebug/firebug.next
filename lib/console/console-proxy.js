/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

const { logConsoleAPIMessage } = require("../console/console-message.js");

const PREF_CONNECTION_TIMEOUT = "devtools.debugger.remote-timeout";
const CATEGORY_WEBDEV = 3;

Cu.import("resource://gre/modules/Services.jsm");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

// Devtools API
let WebConsoleUtils = devtools["require"]("devtools/toolkit/webconsole/utils").Utils;

const STRINGS_URI = "chrome://browser/locale/devtools/webconsole.properties";
let l10n = new WebConsoleUtils.l10n(STRINGS_URI);

const PROMISE_URI = "resource://gre/modules/Promise.jsm";
let { Promise: promise } = Cu.import(PROMISE_URI, {});

/**
 * xxxHonza: we need better way how to customize console.* logs rendering.
 */
function ConsoleProxy(aWebConsole, aTarget)
{
  this.owner = aWebConsole;
  this.target = aTarget;

  this._onPageError = this._onPageError.bind(this);
  this._onLogMessage = this._onLogMessage.bind(this);
  this._onConsoleAPICall = this._onConsoleAPICall.bind(this);
  this._onNetworkEvent = this._onNetworkEvent.bind(this);
  this._onNetworkEventUpdate = this._onNetworkEventUpdate.bind(this);
  this._onFileActivity = this._onFileActivity.bind(this);
  this._onReflowActivity = this._onReflowActivity.bind(this);
  this._onTabNavigated = this._onTabNavigated.bind(this);
  this._onAttachConsole = this._onAttachConsole.bind(this);
  this._onCachedMessages = this._onCachedMessages.bind(this);
  this._connectionTimeout = this._connectionTimeout.bind(this);
  this._onLastPrivateContextExited = this._onLastPrivateContextExited.bind(this);
}

ConsoleProxy.prototype = {
  owner: null,
  target: null,
  client: null,
  webConsoleClient: null,
  connected: false,
  _connectTimer: null,
  _connectDefer: null,
  _disconnecter: null,
  _consoleActor: null,
  _hasNativeConsoleAPI: false,

  connect: function WCCP_connect()
  {
    if (this._connectDefer) {
      return this._connectDefer.promise;
    }

    this._connectDefer = promise.defer();

    let timeout = Services.prefs.getIntPref(PREF_CONNECTION_TIMEOUT);
    this._connectTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this._connectTimer.initWithCallback(this._connectionTimeout,
                                        timeout, Ci.nsITimer.TYPE_ONE_SHOT);

    let connPromise = this._connectDefer.promise;
    connPromise.then(() => {
      this._connectTimer.cancel();
      this._connectTimer = null;
    }, () => {
      this._connectTimer = null;
    });

    let client = this.client = this.target.client;

    client.addListener("logMessage", this._onLogMessage);
    client.addListener("pageError", this._onPageError);
    client.addListener("consoleAPICall", this._onConsoleAPICall);
    client.addListener("networkEvent", this._onNetworkEvent);
    client.addListener("networkEventUpdate", this._onNetworkEventUpdate);
    client.addListener("fileActivity", this._onFileActivity);
    client.addListener("reflowActivity", this._onReflowActivity);
    client.addListener("lastPrivateContextExited", this._onLastPrivateContextExited);
    this.target.on("will-navigate", this._onTabNavigated);
    this.target.on("navigate", this._onTabNavigated);

    this._consoleActor = this.target.form.consoleActor;
    if (!this.target.chrome) {
      let tab = this.target.form;
      this.owner.onLocationChange(tab.url, tab.title);
    }
    this._attachConsole();

    return connPromise;
  },

  _connectionTimeout: function WCCP__connectionTimeout()
  {
    let error = {
      error: "timeout",
      message: l10n.getStr("connectionTimeout"),
    };

    this._connectDefer.reject(error);
  },

  _attachConsole: function WCCP__attachConsole()
  {
    let listeners = ["PageError", "ConsoleAPI", "NetworkActivity",
                     "FileActivity"];
    this.client.attachConsole(this._consoleActor, listeners,
                              this._onAttachConsole);
  },

  _onAttachConsole: function WCCP__onAttachConsole(aResponse, aWebConsoleClient)
  {
    if (aResponse.error) {
      Cu.reportError("attachConsole failed: " + aResponse.error + " " +
                     aResponse.message);
      this._connectDefer.reject(aResponse);
      return;
    }

    this.webConsoleClient = aWebConsoleClient;

    this._hasNativeConsoleAPI = aResponse.nativeConsoleAPI;

    let msgs = ["PageError", "ConsoleAPI"];
    this.webConsoleClient.getCachedMessages(msgs, this._onCachedMessages);

    this.owner._updateReflowActivityListener();
  },

  _onCachedMessages: function WCCP__onCachedMessages(aResponse)
  {
    Trace.sysout("console-proxy _onCachedMessages", arguments);

    // xxxHonza: cached messages slip through the original proxy FIX ME.
    return;

    if (aResponse.error) {
      Cu.reportError("Web Console getCachedMessages error: " + aResponse.error +
                     " " + aResponse.message);
      this._connectDefer.reject(aResponse);
      return;
    }

    if (!this._connectTimer) {
      // This happens if the promise is rejected (eg. a timeout), but the
      // connection attempt is successful, nonetheless.
      Cu.reportError("Web Console getCachedMessages error: invalid state.");
    }

    this.owner.displayCachedMessages(aResponse.messages);

    if (!this._hasNativeConsoleAPI) {
      this.owner.logWarningAboutReplacedAPI();
    }

    this.connected = true;
    this._connectDefer.resolve(this);
  },

  _onPageError: function WCCP__onPageError(aType, aPacket)
  {
    if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.handlePageError(aPacket.pageError);
    }
  },

  _onLogMessage: function WCCP__onLogMessage(aType, aPacket)
  {
    if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.handleLogMessage(aPacket);
    }
  },

  _onConsoleAPICall: function WCCP__onConsoleAPICall(aType, aPacket)
  {
    Trace.sysout("consoleProxy._onConsoleAPICall;", arguments);

    // Custom logging
    if (aPacket.message.level == "log") {
      this.owner.outputMessage(CATEGORY_WEBDEV,
        logConsoleAPIMessage, [aPacket.message]);
    }

    /*if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.handleConsoleAPICall(aPacket.message);
    }*/
  },

  _onNetworkEvent: function WCCP__onNetworkEvent(aType, aPacket)
  {
    if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.handleNetworkEvent(aPacket.eventActor);
    }
  },

  _onNetworkEventUpdate: function WCCP__onNetworkEvenUpdatet(aType, aPacket)
  {
    if (this.owner) {
      this.owner.handleNetworkEventUpdate(aPacket.from, aPacket.updateType,
                                          aPacket);
    }
  },

  _onFileActivity: function WCCP__onFileActivity(aType, aPacket)
  {
    if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.handleFileActivity(aPacket.uri);
    }
  },

  _onReflowActivity: function WCCP__onReflowActivity(aType, aPacket)
  {
    if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.handleReflowActivity(aPacket);
    }
  },

  _onLastPrivateContextExited:
  function WCCP__onLastPrivateContextExited(aType, aPacket)
  {
    if (this.owner && aPacket.from == this._consoleActor) {
      this.owner.jsterm.clearPrivateMessages();
    }
  },

  _onTabNavigated: function WCCP__onTabNavigated(aEvent, aPacket)
  {
    if (!this.owner) {
      return;
    }

    this.owner.handleTabNavigated(aEvent, aPacket);
  },

  releaseActor: function WCCP_releaseActor(aActor)
  {
    if (this.client) {
      this.client.release(aActor);
    }
  },

  disconnect: function WCCP_disconnect()
  {
    Trace.sysout("consoleProxy.destroy;");

    if (this._disconnecter) {
      return this._disconnecter.promise;
    }

    this._disconnecter = promise.defer();

    if (!this.client) {
      this._disconnecter.resolve(null);
      return this._disconnecter.promise;
    }

    this.client.removeListener("logMessage", this._onLogMessage);
    this.client.removeListener("pageError", this._onPageError);
    this.client.removeListener("consoleAPICall", this._onConsoleAPICall);
    this.client.removeListener("networkEvent", this._onNetworkEvent);
    this.client.removeListener("networkEventUpdate", this._onNetworkEventUpdate);
    this.client.removeListener("fileActivity", this._onFileActivity);
    this.client.removeListener("reflowActivity", this._onReflowActivity);
    this.client.removeListener("lastPrivateContextExited", this._onLastPrivateContextExited);
    this.target.off("will-navigate", this._onTabNavigated);
    this.target.off("navigate", this._onTabNavigated);

    this.client = null;
    this.webConsoleClient = null;
    this.target = null;
    this.connected = false;
    this.owner = null;
    this._disconnecter.resolve(null);

    return this._disconnecter.promise;
  },
};

// Exports from this module
exports.ConsoleProxy = ConsoleProxy;
