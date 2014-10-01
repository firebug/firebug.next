/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const protocol = require("devtools/server/protocol");

exports.register = function (handle) {
  handle.addGlobalActor(HelloActor, "helloActor");
};

exports.unregister = function (handle) {
  handle.removeGlobalActor(HelloActor, "helloActor");
};

const HelloActor = protocol.ActorClass({
  typeName: "helloActor",

  hello: protocol.method(function () {
    return;
  }, {
    request: {},
    response: {"message": "Hi Firebug"}
  })
});
