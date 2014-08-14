/* See license.txt for terms of usage */

"use strict";

var tabs = require("sdk/tabs");

const { Trace, TraceError } = require("../core/trace.js").get(module.id);

// xxxHonza: this object should slowly turn into Firebug start button.
// xxxHonza: the ActionButton doesn't seem to be properly unregistered
// when the extension is disabled. This causes the following exception:
// JavaScript error: chrome://browser/content/tabbrowser.xml,
// line 1097: can't access dead object
// See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1053704
//const { ActionButton } = require("sdk/ui/button/action");

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

// Import 'devtools' object
Cu.import("resource://gre/modules/devtools/Loader.jsm")

/*var button = ActionButton({
  id: "helloWorld-link",
  label: "Visit Mozilla",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onClick: handleClick
});
*/

function handleClick(state) {
  let browser = getMostRecentBrowserWindow();
  let currentTab = browser.gBrowser.mCurrentTab;
  let target = devtools.TargetFactory.forTab(currentTab);

  // Open the toolbox with default panel selected.
  browser.gDevTools.showToolbox(target);
}
