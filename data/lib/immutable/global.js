define(function(require) {
  // fake the global Immutable needed by immstruct
  window.Immutable = require("immutable");
});
