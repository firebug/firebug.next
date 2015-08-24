/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/repository");

// Shortcuts
const { SPAN, TABLE, TBODY, TR, TD, DIV } = Reps.DOM;

/**
 * Render method.
 */
function renderTiming(options) {
  Trace.sysout("PerformanceTiming.renderTiming;", options);

  var timing = options.timing;
  var parentNode = options.parentNode;

  var graph = PerformanceTiming({
    bars: timing.bars
  });

  React.render(graph, parentNode);
}

/**
 * This object implements a template for {@PerformanceTiming} object.
 * It's used to render nice page load timing graph in the Console panel.
 * The graph is automatically rendered if the use executes an expression
 * on the Command line that is evaluated to the {@PerformanceTiming} object.
 *
 * For example: type the following into the command line and press enter:
 * 'performance.timing'
 */
var PerformanceTiming = React.createFactory(React.createClass(
/** @lends PerformanceTiming */
{
  displayName: "perfTiming",

  render: function() {
    var bars = this.props.bars;

    var rows = [];
    for (var bar of bars) {
      rows.push(TimingRow({
        bar: bar,
      }));
    };

    return (
      TABLE({className: "perfTimingTable", cellspacing: 0, cellpadding: 0,
        width: "100%", "role": "grid"},
        TBODY({className: "perfTimingTbody", "role": "presentation"},
          rows
        )
      )
    )
  },
}));

/**
 * @template Represents a node in TreeView template.
 */
var TimingRow = React.createFactory(React.createClass(
{
  displayName: "TimingRow",

  render: function() {
    var bar = this.props.bar;

    var rowStyle = {
      "left": bar.left + "%",
      "width": bar.width + "%"
    };

    return (
      TR({},
        TD({},
          DIV({className: "perfTimingBox"},
            DIV({className: "perfTimingBar " + bar.className, style: rowStyle},
              SPAN({className: "perfTimingBarLabel"}, bar.label)
            ),
            DIV({className: "perfTimingEvent domLoading",
              style: {"left": bar.domLoading + "%"}}
            ),
            DIV({className: "perfTimingEvent domInteractive",
              style: {"left": bar.domInteractive + "%"}}
            ),
            DIV({className: "perfTimingEvent domContentLoaded",
              style: {"left": bar.domContentLoaded + "%"}}
            ),
            DIV({className: "perfTimingEvent onLoad",
              style: {"left": bar.onLoad + "%"}}
            ),
            DIV({className: "perfTimingEvent cursor"})
          )
        )
      )
    )
  },
}));

exports.renderTiming = renderTiming;
});
