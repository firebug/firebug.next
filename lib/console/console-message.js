/* See license.txt for terms of usage */

"use strict";

var main = require("../main.js");

const { Cu } = require("chrome");
const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate } = require("../core/domplate.js");
const { Dom } = require("../core/dom.js");
const { Events } = require("../core/events.js");
const { Reps } = require("../reps/reps.js");

// API for custom console messages
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Messages, Widgets } = devtools["require"]("devtools/webconsole/console-output");
const ConsoleGeneric = Messages.ConsoleGeneric;
const Heritage = require("sdk/core/heritage");

const WebConsoleUtils = devtools["require"]("devtools/toolkit/webconsole/utils").Utils;

// Domplate
const { SPAN, A, domplate } = Domplate;

/**
 * TODO: description
 * @param msg {JSON} The packet received from the back-end. 
 */
function ConsoleMessage(msg) {
  Messages.ConsoleGeneric.call(this, msg);

  this.message = msg;
};

ConsoleMessage.prototype = Heritage.extend(ConsoleGeneric.prototype,
/** @lends ConsoleMessage */
{
  // Render console message using registered reps.
  render: function() {
    let render = ConsoleGeneric.prototype.render.bind(this);

    let element = render().element;
    let parentNode = element.querySelector(".message-body");
    Dom.clearNode(parentNode);

    let args = this.message.arguments;
    for (let i = 0; i < args.length; i++) {
      let grip = args[i];
      this.appendObject(args[i], parentNode);
      this.appendSeparator(parentNode);
    }

    return this;
  },

  appendObject: function(object, parentNode) {
    try {
      let rep = Reps.getRep(object, this.context);

      // xxxHonza: Hack until we get IF support in domplate
      // (or bug 116083 gets fixed).
      let tag = rep.tag;
      if (rep === Reps.Text)
          tag = rep.getWhitespaceCorrectedTag(object);

      let node = tag.append({object: object}, parentNode, rep);

      // xxxHonza: hack FIX ME, the listener must be registered
      // by {@Chrome} for all panel contents.
      node.addEventListener("click", (event) => {
        this.output.openVariablesView({
          label: "",
          objectActor: Reps.getTargetRepObject(event.target),
          autofocus: true,
        });
      }, true);

      return node;
    }
    catch (e) {
      TraceError.sysout("consoleMessage.appendObject; EXCEPTION " + e, e);
    }
  },

  appendSeparator: function(parentNode) {
    let tag = SPAN(" ");
    return tag.append({}, parentNode);
  }
});

function logConsoleAPIMessage(aMessage) {
  Trace.sysout("logConsoleAPIMessage ", this);

  let body = null;
  let clipboardText = null;
  let sourceURL = aMessage.filename;
  let sourceLine = aMessage.lineNumber;
  let level = aMessage.level;
  let args = aMessage.arguments;
  let objectActors = new Set();
  let node = null;

  // Gather the actor IDs.
  args.forEach((aValue) => {
    if (WebConsoleUtils.isActorGrip(aValue)) {
      objectActors.add(aValue.actor);
    }
  });

  let msg = new ConsoleMessage(aMessage);
  node = msg.init(this.output).render().element;

  if (objectActors.size > 0) {
    node._objectActors = objectActors;

    if (!node._messageObject) {
      let repeatNode = node.getElementsByClassName("message-repeats")[0];
      repeatNode._uid += [...objectActors].join("-");
    }
  }

  return node;
}

exports.ConsoleMessage = ConsoleMessage;
exports.logConsoleAPIMessage = logConsoleAPIMessage;
