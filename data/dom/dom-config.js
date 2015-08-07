/* See license.txt for terms of usage */

// RequireJS configuration
require.config({
  baseUrl: ".",
  paths: {
    "react": "../lib/react/react",
    "reps": "../../node_modules/firebug.sdk/lib/reps",
  }
});

// Load the main tooltip module
requirejs(["dom"]);
