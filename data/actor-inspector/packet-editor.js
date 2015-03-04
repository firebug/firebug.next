/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const ReactBootstrap = require("react-bootstrap");
const { Reps } = require("reps/reps");

// Reps
require("reps/undefined");
require("reps/string");
require("reps/number");
require("reps/array");
require("reps/object");

// Shortcuts
const OverlayTrigger = React.createFactory(ReactBootstrap.OverlayTrigger);
const Popover = React.createFactory(ReactBootstrap.Popover);
const ButtonGroup = React.createFactory(ReactBootstrap.ButtonGroup);
const Button = React.createFactory(ReactBootstrap.Button);

const Navbar = React.createFactory(ReactBootstrap.Navbar);
const Nav = React.createFactory(ReactBootstrap.Nav);
const ButtonToolbar = React.createFactory(ReactBootstrap.ButtonToolbar);

const { UL, LI, SPAN, DIV,
        TABLE, TBODY, THEAD, TFOOT, TR, TD,
        INPUT, TEXTAREA } = Reps.DOM;

var PacketField = React.createFactory(React.createClass({
  displayName: "PacketField",

  getInitialState: function() {
    return {};
  },

  render: function() {
    var { open, label, cursor, actions, level, hasChildren } = this.props;
    var { renaming, creating } = this.props;

    var { edit, valid } = this.state;
    var { editorRawValue, newKeyValue } = this.state;

    var value = !creating ? cursor.deref() : undefined;
    value = value && value.toJS ? value.toJS() : value;

    var content = [];

    var editorClassName = editorRawValue && !valid ? "invalid" : "valid";
    var valueStr = editorRawValue ? editorRawValue : JSON.stringify(value);
    var valueSummary = Reps.getRep(value)({ object: value });

    var keyEl = !renaming ? label :
          INPUT({ value: (typeof newKeyValue !== "undefined" ? newKeyValue : label),
                  autoFocus: true, placeholder: "new key",
                  onChange: this.onKeyChange, onKeyPress: this.onKeyPress,
                  className: editorClassName, oldStyle: { width: '50%' } });

    var valueEl = !edit ? valueSummary :
          TEXTAREA({ value: valueStr, onChange: this.onChange,
                     autoFocus: true, placeholder: "new value",
                     className: editorClassName, style: { width: '88%' } });

    content = content.concat([
      TD({ key: 'label', onClick: this.onToggleOpen,
           className: "memberLabelCell",
           style: { paddingLeft: 8 * level }
         },
         SPAN({ className: "memberLabel domLabel"}, keyEl)),
      TD({ key: 'value', onDoubleClick: this.onDoubleClick,
           className: "memberValueCell" }, open ? "..." : valueEl)
    ]);

    var rowClassName = "memberRow domRow";

    if (hasChildren) {
      rowClassName += " hasChildren";
    }

    if (open) {
      rowClassName += " opened";
    }

    return (
      OverlayTrigger({
        ref: "popover", trigger: "manual", placement: "bottom",
        overlay: Popover({ title: label, onClick: () => this.hidePopover() },
                         this.renderContextMenu())
      }, TR({ className: rowClassName }, content))
    );
  },

  onDoubleClick: function(evt) {
    this.props.actions.togglePopover(this.refs.popover);

    evt.stopPropagation();
  },

  renderContextMenu: function() {
    var cursor = this.props.cursor;
    var isCollection = (v) => v && (v instanceof Immutable.Map ||
                                    v instanceof Immutable.List);

    var value = cursor.deref();
    var buttons = [
      Button({ onClick: this.onToggleEdit, key: 'edit-save',
               bsSize: "xsmall" }, this.state.edit ? "Save" : "Edit"),
      Button({ onClick: this.onRenameField, key: 'rename',
               bsSize: "xsmall" }, "Rename"),
      Button({ onClick: this.onRemoveFromParent, key: 'remove',
               bsSize: "xsmall" }, "Remove")
    ];

    if (isCollection(value)) {
      buttons.push(Button({ onClick: this.onAddNewFieldInto, key: 'add',
                            bsSize: "xsmall" }, "Add New Child"));
    }

    return ButtonGroup({ }, buttons);
  },

  onAddNewFieldInto: function(event) {
    this.hidePopover();
    var { actions, keyPath } = this.props;
    actions.addNewFieldInto(keyPath);
  },

  onRenameField: function(event) {
    this.hidePopover();
    var { actions, keyPath } = this.props;
    actions.renameField(keyPath);
  },

  onRemoveFromParent: function(event) {
    this.hidePopover();
    var { actions, keyPath } = this.props;
    actions.removeFieldFromParent(keyPath);
  },

  onKeyChange: function(event) {
    this.setState({
      newKeyValue: event.target.value
    });
  },

  onKeyPress: function(event) {
    var { actions, label, keyPath, creating } = this.props;
    var { newKeyValue } = this.state;

    if(event.which == 13) {
      if (!creating) {
        actions.exitRenameFieldEditing(keyPath, label, newKeyValue);
      } else {
        actions.exitCreateFieldEditing(keyPath, newKeyValue);
      }
    }
  },

  onChange: function(event) {
    var stateUpdate = {
      editorRawValue: event.target.value,
      valid: false,
      error: null
    };

    try {
      stateUpdate.value = JSON.parse(event.target.value);
      stateUpdate.valid = true;
    } catch(e) {
      stateUpdate.valid = false;
      stateUpdate.error = e;
    }

    this.setState(stateUpdate);
  },
  hidePopover: function() {
    if (this.refs.popover) {
      this.refs.popover.hide();
    }
  },
  onToggleOpen: function(evt) {
    console.log("TOGGLE OPEN", this.props.keyPath);

    if (!this.props.hasChildren || this.state.edit) {
      return;
    }

    this.hidePopover();

    this.props.actions.toggleOpen(this.props.keyPath);
    evt.stopPropagation();
  },
  onToggleEdit: function(event) {
    this.hidePopover();

    var { value, edit, valid } = this.state;
    var { cursor } = this.props;

    if (edit && valid) {
      cursor.update(() => Immutable.fromJS(value));
    }
    this.setState({
      edit: !edit,
      value: edit ? cursor.deref() : null,
      editorRawValue: null
    });
  }

}));

/**
 * TODO docs
 */

var PackageEditorToolbar = React.createFactory(React.createClass({
  displayName: "PackageEditorToolbar",

  render: function() {
    return Navbar({fixedBottom: true, style: { minHeight: 36}},
      Nav({},
        ButtonToolbar({}, [
          Button({ onClick: this.props.onSend, key: "send",
                   bsStyle: "primary", bsSize: "xsmall",
                   style: { marginLeft: 12 } }, "Send"),

          Button({ onClick: this.props.onAddField, key: "add",
                   bsStyle: "default", bsSize: "xsmall",
                   style: { marginLeft: 12 } }, "Add Field"),

          Button({ onClick: this.props.onRedo, key: "redo",
                   className: "pull-right",
                   disabled: !this.props.isRedoEnabled,
                   bsStyle: "default", bsSize: "xsmall",
                   style: { marginRight: 6 } }, "Redo"),
          Button({ onClick: this.props.onUndo, key: "undo",
                   className: "pull-right",
                   disabled: !this.props.isUndoEnabled,
                   bsStyle: "default", bsSize: "xsmall",
                   style: { marginRight: 6 } }, "Undo"),
          Button({ onClick: this.props.onClear, key: "clear",
                   className: "pull-right",
                   bsStyle: "danger", bsSize: "xsmall",
                   style: { marginRight: 6 } }, "Clear")
        ])));
  }
}));

/**
 * TODO docs
 */

var ObserveReferenceMixin = {
  componentWillUnmount: function() {
    if (this._unobserve) {
      this._unobserve();
      this._unobserve = null;
    }
  },

  componentDidMount: function() {
    this._unobserve = this.props.reference.observe(this.onUpdatedReference);
  },

  getInitialState: function() {
    return {
      cursor: this.props.reference.cursor()
    };
  },

  onUpdatedReference: function() {
    console.log("UPDATED REFERENCE", this.props.reference.cursor().deref().toJS());
    this.setState({
      cursor: this.props.reference.cursor()
    });
  },
};

function nestedObjectToFlattenList(key, level, cursor, keyPath) {
  keyPath = keyPath || [];

  var data = cursor.deref();
  var res = [];
  var hasChildren = data instanceof Immutable.List ||
                    data instanceof Immutable.Map;

  if (level >= 0) {  // skip the fake root packet object level
    res.push({ key: key, level: level, cursor: cursor,
               keyPath: keyPath, hasChildren: hasChildren});
  }

  if (hasChildren) {
    data.forEach(function (value, subkey) {
      res = res.concat(nestedObjectToFlattenList(subkey, level + 1, cursor.cursor(subkey), keyPath.concat(subkey)));
    });
  }

  return res;
}

var PacketEditor = React.createClass({
  displayName: "PacketEditor",
  mixins: [ObserveReferenceMixin],

  render: function() {
    var rows = [];
    var { actions, reference } = this.props;
    var { cursor } = this.state;

    var packetCursor = cursor.cursor("packet");
    var openedKeyPathsCursor = cursor.cursor("openedKeyPaths");
    var creatingFieldInKeyPath = cursor.cursor("creatingFieldInKeyPath").deref();
    var renamingFieldKeyPath = cursor.cursor("renamingFieldKeyPath").deref();

    if (creatingFieldInKeyPath && creatingFieldInKeyPath.length === 0) {
      rows.push(PacketField({ key: "_new",
                              label: "", level: 0,
                              hasChildren: false, keyPath: creatingFieldInKeyPath,
                              renaming: true, creating: true,
                              cursor: cursor, actions: actions }));
    }

    nestedObjectToFlattenList("packet", -1, packetCursor)
      .forEach(function ({key, level, cursor, keyPath, hasChildren}) {
        var parentKeyPath = keyPath.slice(0,-1);
        if (level == 0 || openedKeyPathsCursor.cursor(parentKeyPath).deref()) {
          rows.push(PacketField({ key: keyPath.join("-") || "root", label: key, level: level,
                                  hasChildren: hasChildren, keyPath: keyPath,
                                  open: !!openedKeyPathsCursor.cursor(keyPath).deref(),
                                  renaming: renamingFieldKeyPath ?
                                    keyPath.join("-") == renamingFieldKeyPath.join("-") : false,
                                  cursor: cursor, actions: actions }));
        }

        if (creatingFieldInKeyPath && keyPath.join("-") == creatingFieldInKeyPath.join("-")) {
          rows.push(PacketField({ key: keyPath.join("-") + "_new",
                                  label: "", level: level+1,
                                  hasChildren: false, keyPath: keyPath,
                                  renaming: true, creating: true,
                                  cursor: cursor, actions: actions }));
        }
    });

    return (
      DIV({},
        TABLE({
          className: "domTable", cellPadding: 0, cellSpacing: 0,
          style: { marginBottom: 80 }
        }, TBODY({}, rows) ),
        PackageEditorToolbar({
          onSend: this.onSend,
          onAddField: this.onAddField,
          onClear: this.onClear,
          onUndo: this.onUndo,
          onRedo: this.onRedo,
          isUndoEnabled: this.props.actions.isUndoEnabled(),
          isRedoEnabled: this.props.actions.isRedoEnabled()
        })
      )
    );
  },

  // Event Handlers
  onUndo: function(event) {
    this.props.actions.undo();
  },
  onRedo: function(event) {
    this.props.actions.redo();
  },

  onClear: function(event) {
    this.props.actions.clearPacket();
  },

  onSend: function(event) {
    var { actions, reference } = this.props;
    actions.sendPacket(reference.cursor("packet").deref().toJS());
  },

  onAddField: function(event) {
    this.props.actions.addNewFieldInto([]);
  }
});

// Exports from this module
exports.PacketEditor = React.createFactory(PacketEditor);
});
