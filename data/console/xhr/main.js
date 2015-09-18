/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const store = require("./stores/xhr-store.js");
const { actions } = require("./actions.js");

const dispatcher = Fluxify.createDispatcher({store});
const _actions = Fluxify.bindActionCreators(actions, dispatcher.dispatch);


/**
 * Listen for messages from the Console panel (chrome scope).
 * This function handles network events sent to the Console panel.
 * Every network log displayed in the Console panel is marked as
 * expandable allowing the user to inspect details inline.
 */
function onXhrLog(log) {
  if (log.update) {
    _actions.updateXhrSpy(log);
  } else {
    _actions.addXhrSpy(log);
  }
}

exports.onXhrLog = onXhrLog;
});
