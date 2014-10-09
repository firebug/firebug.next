/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { Cu } = require("chrome");

const protocol = require("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor } = protocol;

const HelloActor = protocol.ActorClass({
  typeName: "helloActor",

  initialize: function(conn, parent) {
    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
  },

  hello: protocol.method(function () {
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
