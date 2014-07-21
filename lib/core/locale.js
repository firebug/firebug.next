/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const DEFAULT_LOCALE = "en-US";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PluralForm.jsm");

const stringBundleService = Services.strings;
const categoryManager = Cc["@mozilla.org/categorymanager;1"].
                          getService(Ci.nsICategoryManager);

let Locale = {};

Locale.$STR = function(name, bundle) {
  return Locale.$STRF(name, [], bundle);
};

Locale.$STRF = function(name, args, bundle) {
  if (!name)
    return "";

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
    }
    else {
      return validate(Locale.getStringBundle().
        formatStringFromName(name, args, args.length));
    }
  }
  catch (ex) {
    TraceError.sysout("Locale.$STRF. There is no entry for'" + name +
      "' in the localization file ", ex);

    // Return the part after the last dot(.) sign or whole the word.
    const index = originalName.lastIndexOf(".");
    return validate(originalName.substr(index + 1));
  }
};

Locale.$STRP = function(name, args, index, bundle) {
  // Use the first index of the |args| if there is no value for |index| .
  index = index || 0;

  let getPluralForm = PluralForm.get;

  // Get pluralRule for the default locale.
  if (prefs["useDefaultLocale"]) {
    const pluralRule = Locale.getDefaultStringBundle().GetStringFromName("pluralRule");
    [getPluralForm] = PluralForm.makeGetter(pluralRule);
  }
  const translatedString = Locale.$STRF(name, args, bundle);
  if (translatedString.search(";") > 0)
    return validate(getPluralForm(args[index], translatedString));

  return translatedString;
};

Locale.registerStringBundle = function(bundleURI) {
  categoryManager.addCategoryEntry("strings_firebug", bundleURI, "", false, true);
  this.stringBundle = null;

  bundleURI = getDefaultStringBundleURI(bundleURI);
  categoryManager.addCategoryEntry("default_strings_firebug", bundleURI, "", false, true);
  this.defaultStringBundle = null;
};

Locale.getStringBundle = function() {
  if (!this.stringBundle)
    this.stringBundle = stringBundleService.createExtensibleBundle("strings_firebug");
  return this.stringBundle;
};

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

// Helpers
const validate = (str) => {
  return str.replace(/\"/g, "\'");
};

// Exports from this module
exports.Locale = Locale;
