/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);

// xxxHonza: this object should slowly turn into Firebug start button.
// xxxHonza: the ActionButton doesn't seem to be properly unregistered
// when the extension is disabled. This causes the following exception:
// JavaScript error: chrome://browser/content/tabbrowser.xml,
// line 1097: can't access dead object
// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1053704
const { ActionButton } = require("sdk/ui/button/action");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

const tabs = require("sdk/tabs");

// xxxHonza: ActionButton can't be used to create 'menu-button' button
// on the toolbar. We need to use CustomizableUI.jsm (lowlevel)
// Read:
// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/CustomizableUI.jsm
// https://blog.mozilla.org/addons/2014/03/06/australis-for-add-on-developers-2/
var button = ActionButton({
  id: "firebug-button",
  label: "Firebug",
  icon: {
    "16": "./firebugSmall.svg",
  },
  onClick: handleClick
});

function handleClick(state) {
  let browser = getMostRecentBrowserWindow();
  let currentTab = browser.gBrowser.mCurrentTab;
  let target = devtools.TargetFactory.forTab(currentTab);

  // Open the toolbox with default panel selected.
  browser.gDevTools.showToolbox(target);
}
