/* See license.txt for terms of usage */

define(function(require, exports, module) {

const constants = require("../constants");

const initialState = {
  spies: new Map(),
};

/**
 * 
 */
function update(state = initialState, action, emitChange) {
  switch(action.type) {
  case constants.XHR_SPY_ADD:
    addSpy(state, action, emitChange);
    break;

  case constants.XHR_SPY_UPDATE:
    updateSpy(state, action, emitChange);
    break;
  }

  return state;
}

/**
 * A new XHR request has been initiated. Let's create a new
 * entry in the list of spies.
 */
function addSpy(state, action, emitChange) {
  var log = action.log;
  var spy = new XhrSpy(log);
  state.spies.set(log.response.actor, spy);

  emitChange("addXhrSpy", spy);
}

function updateSpy(state, action, emitChange) {
  var log = action.log;
  var spy = state.spies.get(log.response.from);

  if (log.update) {
    spy.update(log.response);
  }

  emitChange("updateXhrSpy", spy);
}

// Actions

var actions = {
}

// Exports from this module
exports = {
  update: update,
  actions: actions
}

});
