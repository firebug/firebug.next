/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
var React = require("react");

// Firebug SDK
const { TreeView } = require("reps/tree-view");
const { Reps } = require("reps/repository");
const { PanelView, createView } = require("firebug.sdk/lib/panel-view");

// Firebug
const { DomProvider } = require("./dom-provider");
const { DomDecorator } = require("./dom-decorator");
const { GripStore } = require("./grip-store");
const { Dispatcher } = require("./dispatcher");
const { DomContent } = require("./dom-content");

/**
 * This object represents a view that is responsible for
 * rendering the content - DOM (Document Object Model) of
 * the associated page.
 */
var DomView = createView(PanelView,
/** @lends DomView */
{
  rootGrip: null,

  /**
   * Render the top level application component.
   */
  initialize: function(config) {
    this.rootGrip = JSON.parse(config.rootGrip);

    Trace.sysout("DomView.initialize;", this.rootGrip);

    var store = new GripStore(this);
    var content = DomContent({
      provider: new DomProvider(store),
      decorator: new DomDecorator(),
      data: this.rootGrip,
      mode: "tiny"
    });

    this.theApp = React.render(content, document.querySelector("#content"));
  },

  // Messages from the chrome scope.

  refresh: function(rootGrip) {
    Trace.sysout("DomView.refresh;", rootGrip);

    if (!rootGrip) {
      rootGrip = this.rootGrip;
    }

    this.theApp.setState({
      forceUpdate: (rootGrip.actor == this.rootGrip.actor),
      data: this.theApp.state.data
    });
  },

  onSearch: function(filter) {
    var text = filter.text;
    var reverse = filter.reverse;
  },
});

// End of dom.js
});
