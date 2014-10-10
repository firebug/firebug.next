/* See license.txt for terms of usage */

"use strict";

/**
 * Global event-target that is used to fire global Firebug events
 * related to initialization and shutdown.
 */
const { EventTarget } = require("sdk/event/target");
exports.target = new EventTarget();
