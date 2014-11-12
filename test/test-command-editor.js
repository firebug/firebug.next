/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");
const { openToolbox } = require("./common");
const { openSidePanel } = require("./console");
const { Trace, TraceError } = require("../lib/core/trace").get(module.id);
const { Wrapper } = require("../lib/core/wrapper");

exports["test Command Editor"] = function(assert, done) {
  let config = {
    panelId: "webconsole",
  };

  openToolbox(config).then(({toolbox, cleanUp}) => {
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
      return Promise.resolve()
        .then(() => runWithSelection(editor, sidePanel, editorWin))
        .then(() => checkResult("selection", panel))
        .then(() => runWithNoSelection(editor, sidePanel, editorWin))
        .then(() => checkResult("no selection", panel))
        .then(() => clearBeforeDone(editor, panel))
        .then(() => cleanUp(done));
    }).catch((ex) => {
      console.error(ex);
      TraceError.sysout("Error while executing test-command-editor", ex);
    });
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

  function clearBeforeDone(editor, panel) {
    editor.setValue("");
    panel._firebugPanelOverlay.clearConsole();
    panel._firebugPanelOverlay.toggleSidebar();
  }

  // xxxHonza: waitForMessage() API from console.js module
  // should be utilized.
  function waitForMessage(panel, callback) {
    let overlay = panel._firebugPanelOverlay;
    let doc = overlay.getPanelDocument();
    let expectedSelector = ".message[category=output] .console-string";
    let log = doc.querySelector(expectedSelector);

    let [expectedMatchSel, childSel] = expectedSelector.split(" ");

    function onMessages(event, messages) {
      console.log("onMessages; size " + messages.size);

      let logNodes = Array.from(messages).reduce((nodes, message) => {
        if (message.node.matches(expectedMatchSel)) {
          nodes.push(message.node.querySelector(childSel));
        }
        return nodes;
      }, []);

      if (logNodes.length === 1) {
        panel.hud.ui.off("new-messages", onMessages);
        callback(logNodes[0]);
      }
      else if (logNodes.length > 1) {
        console.log("more than 1 match found in waitForMessage");
      }
      else {
        console.log("no matching log yet");
      }
    };

    panel.hud.ui.on("new-messages", onMessages);
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

  function triggerEvaluate(editorWin) {
    let sidePanelDoc = editorWin.parent.document;
    sidePanelDoc.querySelector("#firebug-commandeditor-run").click();
  }
};

require("sdk/test").run(exports);
