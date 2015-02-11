/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const DEFAULT_LOCALE = "en-US";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");

const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});
const { PluralForm } = Cu.import("resource://gre/modules/PluralForm.jsm", {});

const stringBundleService = Services.strings;
const categoryManager = Cc["@mozilla.org/categorymanager;1"].
  getService(Ci.nsICategoryManager);

// Module implementation
let Locale = {};

/*
 * $STR  - intended for localization of a static string.
 * $STRF - intended for localization of a string with dynamically inserted values.
 * $STRP - intended for localization of a string with dynamically plural forms.
 *
 * Notes:
 * 1) Name with _ in place of spaces is the key in the firebug.properties file.
 * 2) If the specified key isn't localized for particular language, both methods use
 *    the part after the last dot (in the specified name) as the return value.
 *
 * Examples:
 * $STR("Label"); - search for key "Label" within the firebug.properties file
 *                 and returns its value. If the key doesn't exist returns "Label".
 *
 * $STR("Button Label"); - search for key "Button_Label" withing the firebug.properties
 *                        file. If the key doesn't exist returns "Button Label".
 *
 * $STR("net.Response Header"); - search for key "net.Response_Header". If the key doesn't
 *                               exist returns "Response Header".
 *
 * firebug.properties:
 * net.timing.Request_Time=Request Time: %S [%S]
 *
 * let param1 = 10;
 * let param2 = "ms";
 * $STRF("net.timing.Request Time", param1, param2);  -> "Request Time: 10 [ms]"
 *
 * - search for key "net.timing.Request_Time" within the firebug.properties file. Parameters
 *   are inserted at specified places (%S) in the same order as they are passed. If the
 *   key doesn't exist the method returns "Request Time".
 */
Locale.$STR = function(name, bundle) {
  return Locale.$STRF(name, [], bundle);
};

Locale.$STRF = function(name, args, bundle) {
  if (!name) {
    return "";
  }

  // Keep the value of name before manipulating to return back if there is
  // no identifier/key in the localization file corresponding to the name.
  let originalName = name;

  name = name.replace(/\s/g, '_');
  try {
    // If the user is interested to use default locale (en-US)
    // instead of one using by Firefox.
    if (prefs["useDefaultLocale"]) {
      return validate(Locale.getDefaultStringBundle().
        formatStringFromName(name, args, args.length));
    }

    if (bundle) {
      return validate(bundle.getFormattedString(name, args));
    } else {
      return validate(Locale.getStringBundle().
        formatStringFromName(name, args, args.length));
    }
  } catch (ex) {
    TraceError.sysout("Locale.$STRF. ERROR There is no entry for'" +
      originalName + "' in the localization file");

    // Return the part after the last dot(.) sign or whole the word.
    const index = originalName.lastIndexOf(".");
    return validate(originalName.substr(index + 1));
  }
};

Locale.$STRP = function(name, args, index, bundle) {
  // Use the first index of the |args| if there is no value for |index|.
  index = index || 0;

  let getPluralForm = PluralForm.get;

  // Get pluralRule for the default locale.
  if (prefs["useDefaultLocale"]) {
    const pluralRule = Locale.getDefaultStringBundle().GetStringFromName("pluralRule");
    [getPluralForm] = PluralForm.makeGetter(pluralRule);
  }

  const translatedString = Locale.$STRF(name, args, bundle);
  if (translatedString.search(";") > 0) {
    return validate(getPluralForm(args[index], translatedString));
  }

  return translatedString;
};

Locale.registerStringBundle = function(bundleURI) {
  categoryManager.addCategoryEntry("strings_firebug", bundleURI,
    "", false, true);

  this.stringBundle = null;

  bundleURI = getDefaultStringBundleURI(bundleURI);
  categoryManager.addCategoryEntry("default_strings_firebug",
    bundleURI, "", false, true);

  this.defaultStringBundle = null;
};

Locale.getStringBundle = function() {
  if (!this.stringBundle) {
    this.stringBundle = stringBundleService.createExtensibleBundle(
      "strings_firebug");
  }

  return this.stringBundle;
};

// Helpers

Locale.getDefaultStringBundle = function() {
  if (!this.defaultStringBundle) {
    this.defaultStringBundle = stringBundleService.
      createExtensibleBundle("default_strings_firebug");
  }

  return this.defaultStringBundle;
};

const getDefaultStringBundleURI = (bundleURI) => {
  const chromeRegistry = Cc["@mozilla.org/chrome/chrome-registry;1"].
    getService(Ci.nsIChromeRegistry);

  const uri = Services.io.newURI(bundleURI, "UTF-8", null);
  const fileURI = chromeRegistry.convertChromeURL(uri).spec;

  let parts = fileURI.split("/");
  parts[parts.length - 2] = DEFAULT_LOCALE;

  return parts.join("/");
};

const validate = (str) => {
  return str.replace(/\"/g, "\'");
};

// Exports from this module
exports.Locale = Locale;
