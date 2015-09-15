/* See license.txt for terms of usage */

"use strict";

const self = require("sdk/self");
const main = require("../main.js");

// Firebug SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { ToolbarButton } = require("../chrome/panel-toolbar.js");
const { Events } = require("../core/events.js");
const { target } = require("firebug.sdk/lib/dispatcher.js");

const { CustomizableUI } = Cu.import("resource:///modules/CustomizableUI.jsm", {});
const { AREA_PANEL, AREA_NAVBAR } = CustomizableUI;

const InspectorButtonId = "firebug-inspector-button";

/**
 * This object represents Inspector button that is available on
 * the main browser toolbar. There is one instance of this object within
 * Firefox session, but the XUL <toolbarbutton> itself is created for every
 * browser window.
 */
var InspectorButton =
/** @lends InspectorButton */
{
  // Initialization

  initialize: function() {
    Trace.sysout("inspectorButton.initialize;");

    // Create customizable toolbar button.
    CustomizableUI.createWidget({
      id: InspectorButtonId,
      type: "custom",
      defaultArea: "",
      allowedAreas: [AREA_PANEL, AREA_NAVBAR],
      onBuild: this.onBuild.bind(this)
    });
  },

  shutdown: function(reason) {
    CustomizableUI.destroyWidget(InspectorButtonId);
  },

  /**
   * An instance of the button (widget) is created for every browser window.
   *
   * @param {Document} Browser document the button is being built in.
   *
   * @returns {XULElement} The result XUL element reference (not appended
   * into the document yet).
   */
  onBuild: function(doc) {
    Trace.sysout("inspectorButton.onBuild;", doc);

    let button = new ToolbarButton({
      document: doc,
      id: InspectorButtonId,
      label: Locale.$STR("inspector.inspect.label"),
      tooltiptext: Locale.$STR("inspector.inspect.tip"),
      "class": "toolbarbutton-1 chromeclass-toolbar-additional",
      image: "chrome://firebug/skin/inspect.svg",
      command: this.onInspect.bind(this)
    });

    return button.button;
  },

  onInspect: function(event) {
    Trace.sysout("inspectorButton.onInspect;", event);

    Events.cancelEvent(event);

    // Open the toolbox and activate inspection mode.
    main.Firebug.showToolbox(event.view, "inspector").then(toolbox => {
      let pickButton = toolbox.doc.querySelector("#command-button-pick");
      pickButton.click();
    });
  },
}

// Registration
target.register(InspectorButton);

// Exports from this module
exports.InspectorButton = InspectorButton;
