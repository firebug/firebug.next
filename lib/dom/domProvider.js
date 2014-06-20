/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Trace, TraceError } = require("../core/trace.js");
const { Domplate } = require("../core/domplate.js");

function DomProvider(object) {
}

/**
 * @provider TODO
 */
DomProvider.prototype =
/** @lends DomProvider */
{
    getValue: function(object) {
    },

    hasChildren: function(object) {
    },
};

// Exports from this module
exports.DomProvider = DomProvider;
