/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { openToolbox } = require("dev/utils");
const { Trace, TraceError } = require("../lib/core/trace").get(module.id);
const { Wrapper } = require("../lib/core/wrapper");
const { loadFirebug } = require("./common");

// Import 'devtools' object
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});

exports["test Command Editor"] = function(assert, done) {
  loadFirebug();
  // TODO put the logic in a util file.
  let sidePanelId = "commandEditor";
  // Workaround for https://github.com/mozilla/addon-sdk/pull/1688
  let promise = openToolbox({prototype: {}, id: "webconsole"})
    .then((toolbox) => {
    return new Promise((resolve, reject) => {
      let panel = toolbox.getCurrentPanel();
      let jsterm = panel._firebugPanelOverlay.getTerminal();
      jsterm.once("sidebar-created", (eventName, sidebar) => {
        if (!sidebar) {
          reject(new Error("can't get the sidebar"));
        }
        sidebar.once("select", () => {
          sidebar.select(sidePanelId);
          resolve({panel: panel, sidePanel: sidebar.getTab(sidePanelId)});
        });
      });
      panel._firebugPanelOverlay.toggleSidebar();
    });
  });

  promise.then(({panel, sidePanel}) => {
    let iframe = sidePanel.querySelector(".iframe-commandEditor");
    if (iframe == null) {
      throw new Error("iframe is null");
    }

    // Adding editorWin to the next promise handler.
    let editorWin = XPCNativeWrapper.unwrap(iframe.contentWindow);

    return new Promise((resolve, reject) => {
      let doResolve = () => resolve({panel, sidePanel, editorWin});
      if (editorWin.document.readyState !== "complete") {
        editorWin.addEventListener("load", doResolve);
      }
      else {
        doResolve();
      }
    });
  }).then(({panel, sidePanel, editorWin}) => {
    let { editor } = editorWin;

    // Promise-chain everything. Note that runWithSelection and
    // runWithNoSelection are synchronous and checkResult is async
    // (it returns a new Promise).
    return Promise.resolve()
      .then(() => runWithSelection(editor, sidePanel, editorWin))
      .then(() => checkResult("selection", panel))
      .then(() => runWithNoSelection(editor, sidePanel, editorWin))
      .then(() => checkResult("no selection", panel))
      .then(() => done());
  }).catch((ex) => {
    console.error(ex);
    TraceError.sysout("Error while executing test-command-editor", ex);
  });


  // Helpers
  function runWithSelection(editor, sidePanel, win) {
    let instructions = "let a = \"no selection\";";
    instructions += "window.a || \"selection\";";

    let selectionStart = instructions.indexOf(";")+1;

    editor.setValue(instructions);

    selectInEditor(editor, {line: 0, ch: selectionStart},
      {line: 0, ch: instructions.length});

    triggerEvaluate(win);
  }

  function runWithNoSelection(editor, sidePanel, win) {
    selectInEditor(editor, {line: 0, ch: 0}, {line: 0, ch: 0});
    triggerEvaluate(win);
  }

  function checkResult(expected, panel) {
    return new Promise((resolve) => {
      waitForMessage(panel, (log) => {
        assert.ok(log.textContent === `"${expected}"`, "the evaluated " +
          "expression should give this result : " + expected);
        resolve();
      });
    });
  }



  function waitForMessage(panel, callback) {
    let overlay = panel._firebugPanelOverlay;
    let doc = overlay.getPanelDocument();
    let expectedSelector = ".message[category=output] .console-string";
    let log = doc.querySelector(expectedSelector);

    let [expectedMatchSel, childSel] = expectedSelector.split(" ");
    panel.hud.ui.once("new-messages", (event, messages) => {
      let logNodes = Array.from(messages).reduce((nodes, message) => {
        if (message.node.matches(expectedMatchSel))
          nodes.push(message.node.querySelector(childSel));
        return nodes;
      }, []);

      if (logNodes.length === 1)
        callback(logNodes[0]);
      else if (logNodes.length > 1)
        console.error("more than 1 match found in waitForMessage");
      else
        console.log("no matching log yet");
    });
  }

  function selectInEditor(editor, start, end) {
    let win = Cu.getGlobalForObject(editor);
    let cloneIntoCMScope = (pos) =>
      Wrapper.cloneIntoContentScope(win, pos);

    // Focusing looks to be required to select text in CodeMirror.
    editor.focus();

    editor.setSelection(
      cloneIntoCMScope(start),
      cloneIntoCMScope(end)
    );
  }

  function triggerEvaluate(editorWin) {
    // xxxFlorent: maybe better to send events? or is that fine?
    let sidePanelDoc = editorWin.parent.document;
    sidePanelDoc.querySelector("#firebug-commandeditor-run").click();
  }
};


require("sdk/test").run(exports);
