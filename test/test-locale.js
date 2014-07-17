/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { Locale } = require("./core/locale.js");

exports["test locale (sync)"] = function(assert) {
  let text;

  // 1 item
  text = Locale.$STRP("firebug.storage.totalItems", [1]);
  assert.ok(text == "1 item in Storage", "Singular must be used");

  // 2 items
  text = Locale.$STRP("firebug.storage.totalItems", [2]);
  assert.ok(text == "2 items in Storage", "Plural must be used");
};

require("sdk/test").run(exports);
