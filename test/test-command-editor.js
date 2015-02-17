/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { openSidePanel, waitForMessage } = require("./console");
const { Trace, TraceError } = require("../lib/core/trace").get(module.id);
const { Wrapper } = require("../lib/core/wrapper");
const { getToolboxWhenReady } = require("./toolbox.js");
const { startServer, stopServer } = require("./httpd.js");
const { closeTab } = require("./window.js");

exports["test Command Editor"] = function(assert, done) {
  let {server, url} = startServer();

  getToolboxWhenReady(url, "webconsole").then(({toolbox, tab}) => {
    openSidePanel(toolbox, "commandEditor").then(({panel, sidePanel}) => {
      let iframe = sidePanel.querySelector(".iframe-commandEditor");
      if (iframe == null) {
        throw new Error("iframe is null");
      }

      let editorWin = XPCNativeWrapper.unwrap(iframe.contentWindow);
      let { editor } = editorWin;

      // Promise-chain everything. Note that runWithSelection and
      // runWithNoSelection are synchronous and checkResult is async
      // (it returns a new Promise).
      return Promise.resolve().
        then(() => runWithSelection(panel, editor, sidePanel, editorWin)).
        then(() => checkResult(toolbox, "\"selection\"", panel)).
        then(() => runWithNoSelection(panel, editor, sidePanel, editorWin)).
        then(() => checkResult(toolbox, "\"no selection\"", panel)).
        then(() => clearBeforeDone(editor, panel)).
        then(() => cleanUp(tab));
    });
  });

  // Helpers (defined in scope of the test, so assert API is available)

  function cleanUp(tab) {
    closeTab(tab);
    stopServer(server, done);
  }

  function runWithSelection(panel, editor, sidePanel, win) {
    let instructions = "let a = \"no selection\";";
    instructions += "window.a || \"selection\";";

    let selectionStart = instructions.indexOf(";") + 1;

    editor.setValue(instructions);

    selectInEditor(editor, {line: 0, ch: selectionStart},
      {line: 0, ch: instructions.length});

    triggerEvaluate(panel, sidePanel);
  }

  function runWithNoSelection(panel, editor, sidePanel, win) {
    selectInEditor(editor, {line: 0, ch: 0}, {line: 0, ch: 0});
    triggerEvaluate(panel, sidePanel);
  }

  function checkResult(toolbox, expected, panel) {
    let config = {
      cssSelector: ".message[category=output] .console-string"
    };

    return waitForMessage(toolbox, config).then(result => {
      assert.equal(result.length, 1, "There must be one output message");
      assert.equal(result[0].textContent, expected, "the evaluated " +
        "expression should give this result : " + expected);
    });
  }

  function clearBeforeDone(editor, panel) {
    editor.setValue("");
    panel._firebugPanelOverlay.clearConsole();
    panel._firebugPanelOverlay.toggleSidebar();
  }

  function selectInEditor(editor, start, end) {
    let win = Cu.getGlobalForObject(editor);
    let cloneIntoCMScope = (pos) => Wrapper.cloneIntoContentScope(win, pos);

    // Focusing looks to be required to select text in CodeMirror.
    editor.focus();

    editor.setSelection(
      cloneIntoCMScope(start),
      cloneIntoCMScope(end)
    );
  }

  function triggerEvaluate(panel, sidePanel) {
    panel._firebugPanelOverlay.clearConsole();
    let sidePanelDoc = sidePanel.ownerDocument;
    sidePanelDoc.querySelector("#firebug-commandeditor-run").click();
  }
};

require("sdk/test").run(exports);
