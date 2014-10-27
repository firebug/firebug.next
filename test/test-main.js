/* See license.txt for terms of usage */

"use strict";

var { main, Firebug } = require("../lib/index.js");

exports["test main"] = function(assert) {
  assert.ok(Firebug, "The Firebug object must exist!");
};

require("sdk/test").run(exports);
