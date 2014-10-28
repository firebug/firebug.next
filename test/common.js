/* See license.txt for terms of usage */

"use strict";

const { main, Firebug } = require("../lib/index.js");

exports.loadFirebug = function() {
  if (!Firebug.chromes) {
    main({loadReason: "install"});
  }
};
