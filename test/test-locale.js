/* See license.txt for terms of usage */

"use strict";

const { Locale } = require("../lib/core/locale.js");

exports["test Locale module API"] = function(assert) {
  let text;

  // xxxHonza: it would be better to have test-locale.properties file
  // for this test, but registerStringBundle expects chrome URL...
  Locale.registerStringBundle("chrome://firebug/locale/firebug.properties");

  // 1 item
  text = Locale.$STRP("firebug.storage.totalItems", [1]);
  assert.ok(text == "1 item in Storage", "Singular must be used");

  // 2 items
  text = Locale.$STRP("firebug.storage.totalItems", [2]);
  assert.ok(text == "2 items in Storage", "Plural must be used");
};

require("sdk/test").run(exports);
