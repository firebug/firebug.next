/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { openToolbox } = require("dev/utils");
const { Trace, TraceError } = require("../lib/core/trace").get(module.id);
const { loadFirebug } = require("./common");
const { setTimeout } = require("sdk/timers");

// Import 'devtools' object
Cu.import("resource://gre/modules/devtools/Loader.jsm");

exports["test Command Editor"] = function(assert, done) {
  loadFirebug();
  // TODO put the logic in a util file.
  let sidePanelId = "commandEditor";
  // Workaround for https://github.com/mozilla/addon-sdk/pull/1688
  let promise = openToolbox({prototype: {}, id: "webconsole"}).then((toolbox) => {
    return new Promise((resolve, reject) => {
      let panel = toolbox.getCurrentPanel();
      let jsterm = panel._firebugPanelOverlay.getTerminal();
      jsterm.once("sidebar-created", () => {
        // xxxFlorent: panel._firebugPanelOverlay.sidebar; is null. I have to use a timer...
        // Is there any other way to get the sidebar object? (the setTimeout is not a viable solution I guess)
        setTimeout(() => {
          let sidebar = panel._firebugPanelOverlay.sidebar;
          if (!sidebar)
            reject(new Error("can't get the sidebar"));
          sidebar.select(sidePanelId);
          resolve(sidebar.getTab(sidePanelId));
        }, 1000);
      });
      panel._firebugPanelOverlay.toggleSidebar();
    });
  });

  promise.then((sidePanel) => {
    console.log("step 3");
    let iframe = sidePanel.querySelector(".iframe-commandEditor");
    let editorWin = XPCNativeWrapper.unwrap(iframe.contentWindow);
    let { editor } = editorWin;
    doTests(editor, sidePanel);
  }, (error) => console.error(error));
};

function doTests(editor, sidePanel) {
  var instructions = "a = \"no selection\";";
  instructions += "window.a || \"selection\";";

  var selectionStart = instructions.indexOf(";")+1;

  // expected results:
  var RES_NO_SELECTION = 'no selection';
  var RES_SELECTION = 'selection';

  editor.setSelection(selectionStart);


}

// Taken from test/test-console-clear.js
function waitForMessage(panel, callback) {
  let overlay = panel._firebugPanelOverlay;
  let doc = overlay.getPanelDocument();
  let log = doc.querySelector(".message[category=console] .console-string");
  if (log) {
    callback();
    return;
  }
}



require("sdk/test").run(exports);
