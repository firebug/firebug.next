/* See license.txt for terms of usage */

define(function(require, exports, module) {

const constants = require("../constants.js");
const { XhrSpy } = require("./xhr-spy.js");

const initialState = {
  spies: new Map(),
};

// Action Handling

/**
 * 
 */
function update(state = initialState, action, emitChange) {
  Trace.sysout("xhr-spies.update;", arguments);

  switch(action.type) {
  case constants.XHR_SPY_ADD:
    onAddXhrSpy(state, action, emitChange);
    break;

  case constants.XHR_SPY_UPDATE:
    onUpdateXhrSpy(state, action, emitChange);
    break;
  }

  return state;
}

/**
 * A new XHR request has been initiated. Let's create a new
 * entry in the list of spies.
 */
function onAddXhrSpy(state, action, emitChange) {
  Trace.sysout("xhr-spies.addXhrSpy;", arguments);

  var log = action.payload.log;
  var spy = new XhrSpy(log);
  state.spies.set(log.response.actor, spy);

  emitChange("addXhrSpy", spy);
}

function onUpdateXhrSpy(state, action, emitChange) {
  Trace.sysout("xhr-spies.updateXhrSpy;", arguments);

  var log = action.payload.log;
  var spy = state.spies.get(log.response.from);

  if (log.update) {
    spy.update(log.response);
  }

  emitChange("updateXhrSpy", spy);
}

// Actions

var actions = {
  addXhrSpy: function(log) {
    return (dispatch, getState) => {
      dispatch({
        type: constants.XHR_SPY_ADD,
        payload: {
          log: log
        }
      });
    }
  },

  updateXhrSpy: function(log) {
    return (dispatch, getState) => {
      dispatch({
        type: constants.XHR_SPY_UPDATE,
        payload: {
          log: log
        }
      });
    }
  }
}

// Exports from this module
exports.update = update;
exports.actions = actions;

});
