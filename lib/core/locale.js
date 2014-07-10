/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js");

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
  try
  {
    if (bundle) {
      return validate(bundle.getFormattedString(name, args));
    }
    else {
      return validate(Locale.getStringBundle().
        formatStringFromName(name, args, args.length));
    }
  }
  catch (ex)
  {
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
  const translatedString = Locale.$STRF(name, args, bundle);
  if (translatedString.search(";") > 0)
    return validate(getPluralForm(args[index], translatedString));

  return translatedString;
};

Locale.registerStringBundle = function(bundleURI) {
  categoryManager.addCategoryEntry("strings_firebug", bundleURI, "", false, true);
  this.stringBundle = null;
};

Locale.getStringBundle = function()
{
  if (!this.stringBundle)
    this.stringBundle = stringBundleService.createExtensibleBundle("strings_firebug");
  return this.stringBundle;
};

// Helpers
const validate = (str) => {
  return str.replace(/\"/g, "\'");
};

// Exports from this module
exports.Locale = Locale;
