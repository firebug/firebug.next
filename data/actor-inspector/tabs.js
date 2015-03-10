/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");
var ReactBootstrap = require("react-bootstrap");

// Shortcuts
var TabbedArea = React.createFactory(ReactBootstrap.TabbedArea);
var TabPane = React.createFactory(ReactBootstrap.TabPane);

const { Reps } = require("reps/reps");
const { DIV } = Reps.DOM;

var content = document.getElementById("content")

var key = 1;

function handleSelect(selectedKey) {
  key = selectedKey;
  renderTabbedBox();
}

// xxxHonza: TODO: localization
var TabbedBox = React.createClass({
  displayName: "TabbedBox",
  render: function() {
    return (
      TabbedArea({activeKey: key, onSelect: handleSelect},
        TabPane({eventKey: 1, tab: "Packets"},
          DIV({className: "actorPane", id: "tabPacketsPane"},
            "History of sent/received packets"
          )
        ),
        TabPane({eventKey: 2, tab: "Global Actors"},
          DIV({className: "actorPane", id: "globalActorsPane"})
        ),
        TabPane({eventKey: 3, tab: "Tab Actors"},
          DIV({className: "actorPane", id: "tabActorsPane"})
        ),
        TabPane({eventKey: 4, tab: "Actor Factories"},
          DIV({className: "actorPane", id: "actorFactoriesPane"})
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
