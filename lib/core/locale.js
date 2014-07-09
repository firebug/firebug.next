/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const { Trace, TraceError } = require("../core/trace.js");

// "_" will make it possible to work with existing tools
// that expect "_" to indicate localizable strings.
// More info: https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/l10n
const _ = require("sdk/l10n").get;

// Module Implementation
// xxxHonza: The module implements only basic API, so the reset of
// the code base can start localizing strings. Still needs to be
// finished, see: https://github.com/firebug/firebug.next/issues/12
var Locale = {};

Locale.$STR = function(name) {
  return Locale.$STRF(name);
};

Locale.$STRF = function(name, args) {
  if (!name)
    return "";

  // Keep the value of name before manipulating to return back if there is
  // no identifier/key in the localization file corresponding to the name.
  let originalName = name;

  name = name.replace(/\s/g, '_');
  let localizedStr = _.apply(this, arguments);

  // _() returns a value same as the identifier's if it can't find
  // a entry for the identifier/key passed to the func.
  if (localizedStr != name)
    return validate(localizedStr);

  var index = originalName.lastIndexOf(".");

  // xxxFarshid: As an escaped char like '\.' occupies only one position
  // in a char sequence, I think it wouldn't evaluate to true. Yet, came
  // from the firebug code just to make sure I am not missing something!
  if (index > 0 && originalName.charAt(index-1) != "\\")
    originalName = originalName.substr(index + 1);

  return validate(originalName);

};

Locale.$STRP = function(name, index, args) {
  if (index === void(0))
    index = 0;

  // The plural form number must be passed as the second
  // argument (|name| is the first).
  if (index != 0)
    [arguments[index], arguments[1]] = [arguments[1], arguments[index]];

  return Locale.$STRF.apply(this, arguments);
};

// Helpers
const validate = (str) => {
  return str.replace(/"/g, "'");
};

// Exports from this module
exports.Locale = Locale;
