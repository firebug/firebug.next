/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

const main = require("../main.js");
const self = require("sdk/self");

const { Class } = require("sdk/core/heritage");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { BasePanel } = require("./base-panel.js");
const { createView } = require("dev/panel/view");

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 *
 * xxxHonza: BaseSidePanel doesn't register theme changes listeners
 * and so doesn't support onApply/UnapplyTheme callbacks.
 * Note that basic support is done in {@BasePanel} object.
 */
const BaseSidePanel = Class(
/** @lends BaseSidePanel */
{
  extends: BasePanel,

  /**
   * Executed by the framework when the panel is created
   *
   * @param frame The <iframe> element associated with this side panel
   * @param {Toolbox} Reference to the parent toolbox object.
   * @param {BasePanel} Reference to the parent main panel.
   */
  setup: function({frame, toolbox, owner}) {
    BasePanel.prototype.setup.apply(this, arguments);

    Trace.sysout("BaseSidePanel.setup; " + this.id, arguments);

    this.owner = owner;
    this.toolbox = toolbox;
    this.panelFrame = frame;
  },

  onReady: function(options) {
    BasePanel.prototype.onReady.apply(this, arguments);

    Trace.sysout("BaseSidePanel.onReady; " + this.id, this);

    this.panelNode = options.window.document.body;
  },
});

// Exports from this module
exports.BaseSidePanel = BaseSidePanel;
