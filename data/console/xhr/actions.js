/* See license.txt for terms of usage */

define(function(require, exports, module) {

"use strict";

const constants = require("./constants.js");

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
exports.actions = actions;
});
