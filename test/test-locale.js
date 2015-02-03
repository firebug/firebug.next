/* See license.txt for terms of usage */

"use strict";

const { Locale } = require("../lib/core/locale.js");

/**
 * This test is intended to test Locale API.
 */
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
  
    // Unit Testing $STRF
  
  text = Locale.$STRF(null);
  assert.ok(text === "", "Empty string is returned if 'name' is null");
  
  text = Locale.$STRF(undefined);
  assert.ok(text === "", "Empty string is returned if 'name' is undefined");
  
  text = Locale.$STRF("firebug.storage.somethingnonexistent");
  assert.ok(text === "somethingnonexistent", "Property with partial match: " + 
    " part after last dot is returned");
	
  text = Locale.$STRF("somethingcompletelynonexistent");
  assert.ok(text === "somethingcompletelynonexistent", "Property with no" + 
    " partial match (no dots in name): full name is returned"); 
	
  text = Locale.$STRF("somethingcompletely.nonexistent");
  assert.ok(text === "nonexistent", "Property with no" + 
    " partial match (dots in name): part after last dot is returned"); 	
};

require("sdk/test").run(exports);
