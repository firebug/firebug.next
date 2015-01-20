/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Require external modules
var React = require("react");
var ReactBootstrap = require("react-bootstrap");

// Shortcuts
var TabbedArea = React.createFactory(ReactBootstrap.TabbedArea);
var TabPane = React.createFactory(ReactBootstrap.TabPane);

var key = 1;

function handleSelect(selectedKey) {
  key = selectedKey;
  renderTabbedBox();
}

var TabbedBox = React.createClass({
  render: function() {
    return (
      TabbedArea({activeKey: key, onSelect: handleSelect},
        TabPane({eventKey: 1, tab: "Editor"},
          "TabPane 1 content"
        ),
        TabPane({eventKey: 2, tab: "Preview"},
          "TabPane 2 content"
        )
      )
    )
  }
});

var tabbedBox = React.createFactory(TabbedBox);

// Rendering
function renderTabbedBox () {
  React.render(
    tabbedBox(),
    document.getElementById("content")
  );
}

// Exports from this module
exports.renderTabbedBox = renderTabbedBox;

});
