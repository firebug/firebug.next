/* See license.txt for terms of usage */

// RequireJS configuration
require.config({
  baseUrl: ".",
  paths: {
    "jquery": "../lib/jquery/jquery.min",
    "react": "../lib/react/react",
    "bootstrap": "../lib/bootstrap/js/bootstrap.min",
    "react-bootstrap": "../lib/react-bootstrap/react-bootstrap.min",
  }
});

// Load the main panel module
requirejs(["inspector"]);
