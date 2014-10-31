/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { openTab, getBrowserForTab, closeTab } = require("sdk/tabs/utils");
const { openToolbox } = require("dev/utils");
const { Trace, TraceError } = require("../lib/core/trace").get(module.id);
const { Wrapper } = require("../lib/core/wrapper");
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
      jsterm.once("sidebar-created", (eventName, sidebar) => {
        if (!sidebar)
          reject(new Error("can't get the sidebar"));
        setTimeout(() => {
          sidebar.select(sidePanelId);
          resolve({panel: panel, sidePanel: sidebar.getTab(sidePanelId)});
        }, 300);
      });
      panel._firebugPanelOverlay.toggleSidebar();
    });
  });

  promise.then(({panel, sidePanel}) => {
    let iframe = sidePanel.querySelector(".iframe-commandEditor");
    if (iframe == null)
      console.error("iframe is null");
    let editorWin = XPCNativeWrapper.unwrap(iframe.contentWindow);
    let { editor } = editorWin;

    // Create a false Promise to promise-chain everything.
    return new Promise((resolve) => resolve())
      .then(() => runWithSelection(editor, sidePanel, editorWin))
      .then(() => checkResult("selection", panel))
      .then(() => runWithNoSelection(editor, sidePanel, editorWin))
      .then(() => checkResult("no selection", panel))
      .then(() => done());
  }).catch((ex) => console.error(ex));


  // Helpers
  function runWithSelection(editor, sidePanel, win) {
    let instructions = "var a = \"no selection\";";
    instructions += "window.a || \"selection\";";

    let selectionStart = instructions.indexOf(";")+1;

    // expected results:
    let RES_NO_SELECTION = 'no selection';
    let RES_SELECTION = 'selection';

    editor.setValue(instructions);

    selectInEditor(editor, win, {line: 0, ch: selectionStart},
      {line: 0, ch: instructions.length});

    triggerEvaluate(win);
  }

  function runWithNoSelection(editor, sidePanel, win) {
    selectInEditor(editor, win, {line: 0, ch: 0}, {line: 0, ch: 0});
    triggerEvaluate(win);
  }

  function checkResult(expected, panel) {
    return new Promise((resolve) => {
      waitForMessage(panel, assert, (log) => {
        assert.ok(log.textContent === `"${expected}"`, "the evaluated " +
          "expression should give this result : " + expected);
        resolve();
      });
    });
  }


  // Taken from test/test-console-clear.js
  function waitForMessage(panel, callback) {
    let win = panel.hud.iframeWindow;
    let doc = win.document;
    var observer = new win.MutationObserver((records) => {
      observer.disconnect();
      // Flattening the addedNodes of the records.
      let addedNodes = [].concat(...records.map(x => Array.from(x.addedNodes)));
      if (addedNodes.length === 2) {
        let log = addedNodes[1].querySelector(".console-string");
        callback(log);
      }
      else {
        assert.ok(false, "a log should appear");
      }
    });
    observer.observe(doc.getElementById("output-container"), {childList: true});
  }

  // xxxFlorent: find a way to get the window from the editor object (if possible ?)
  function selectInEditor(editor, win, start, end) {
    let cloneIntoCMScope = (pos) =>
      Wrapper.cloneIntoContentScope(win, pos);

    // Focusing looks to be required to select text in CodeMirror.
    editor.focus();

    editor.setSelection(
      cloneIntoCMScope(start),
      cloneIntoCMScope(end)
    );
  }

  function triggerEvaluate(win) {
    // xxxFlorent: maybe better to send events? or is that fine?
    let message = Wrapper.cloneIntoContentScope(win, {
      type: "evaluate"
    });
    win.sendMessage(message);
  }
};


require("sdk/test").run(exports);
