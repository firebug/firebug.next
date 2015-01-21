/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");
var ReactBootstrap = require("react-bootstrap");

// Shortcuts
var TabbedArea = React.createFactory(ReactBootstrap.TabbedArea);
var TabPane = React.createFactory(ReactBootstrap.TabPane);

var content = document.getElementById("content")

var key = 1;

function handleSelect(selectedKey) {
  key = selectedKey;
  renderTabbedBox();
}

// xxxHonza: TODO: localization
var TabbedBox = React.createClass({
  render: function() {
    return (
      TabbedArea({activeKey: key, onSelect: handleSelect},
        TabPane({eventKey: 1, tab: "Global Actors"},
          React.DOM.div({className: "actorPane", id: "globalActorsPane"})
        ),
        TabPane({eventKey: 2, tab: "Local Actors"},
          React.DOM.div({className: "actorPane", id: "localActorsPane"},
            "TODO")
        )
      )
    )
  }
});

var tabbedBox = React.createFactory(TabbedBox);

// Rendering
function renderTabbedBox() {
  React.render(tabbedBox(), content);
}

// Exports from this module
exports.renderTabbedBox = renderTabbedBox;

});
