/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { Cu } = require("chrome");

const protocol = require("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

var scope = {};
Cu["import"]("resource://fbtrace/firebug-trace-service.js", scope);
var FBTrace = scope.traceConsoleService.getTracer("extensions.firebug");

exports.register = function (handle) {
  handle.addGlobalActor(HelloActor, "helloActor");
};

exports.unregister = function (handle) {
  handle.removeGlobalActor(HelloActor, "helloActor");
};

const HelloActor = protocol.ActorClass({
  typeName: "helloActor",

  initialize: function(conn, parent) {
    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    FBTrace.sysout("loggeractor.initialize;", arguments);
  },

  hello: protocol.method(function () {

    FBTrace.sysout("this.parent", this.parent);

    let result = {
      msg: "Hello from the backend!",
      userAgent: this.parent.window.navigator.userAgent
    };
    return result;
  }, {
    request: {},
    response: RetVal("json"),
  })
});
