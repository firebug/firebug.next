/* See license.txt for terms of usage */

define(function(require) {
  require("immutable-global"); // WORKAROUND: needed by immstruct

  var React = require("react");
  var immstruct = require("immstruct");
  var { PacketEditor } = require("./packet-editor");

  var stateTree = immstruct.withHistory({
    packetEditor: {
      packet: {
        to: "root",
        type: "requestTypes"
      },
      openedKeyPaths: {},
      creatingFieldInKeyPath: null,
      renamingFieldKeyPath: null
    },
    currentPopover: null
  });

  var packetEditorActions = {
    setPacket: function (packet) {
      this.togglePopover();

      stateTree.cursor([]).update(_ => {
        return Immutable.fromJS({
          packetEditor: {
            packet: packet,
            openedKeyPaths: {},
            creatingFieldInKeyPath: null,
            renamingFieldKeyPath: null,
            mode: 'view'
          },
          currentPopover: null
        });
      });
      stateTree.forceHasSwapped(null, null, ["packetEditor"]);
    },
    isUndoEnabled: function() {
      return stateTree._currentRevision > 0 && stateTree.history.size > 0;
    },
    isRedoEnabled: function() {
      return stateTree._currentRevision < stateTree.history.size - 1;
    },
    undo: function() {
      stateTree.undo();
      stateTree.forceHasSwapped(null, null, ["packetEditor"]);
    },
    redo: function() {
      stateTree.redo();
      stateTree.forceHasSwapped(null, null, ["packetEditor"]);
    },
    addNewFieldInto: function(keyPath) {
      stateTree.cursor(
        ["packetEditor", "creatingFieldInKeyPath"]
      ).update(() => keyPath);
    },
    renameField: function(keyPath) {
      stateTree.cursor(
        ["packetEditor", "renamingFieldKeyPath"]
      ).update(() => keyPath);
    },
    exitRenameFieldEditing: function(keyPath, oldKey, newKey) {
      stateTree.cursor(
        ["packetEditor", "renamingFieldKeyPath"]
      ).update(() => null);

      // TODO: check if the newKey is invalid or it already exists
      var parentKeyPathCursor = stateTree.cursor(
        ["packetEditor", "packet"].concat(keyPath.slice(0, -1))
      );

      var value = parentKeyPathCursor.cursor(oldKey).deref();
      parentKeyPathCursor.delete(oldKey);
      parentKeyPathCursor.set(newKey, value);
    },
    exitCreateFieldEditing: function(keyPath, newKey) {
      stateTree.cursor(
        ["packetEditor", "creatingFieldInKeyPath"]
      ).update(() => null);

      var parentKeyPathCursor = stateTree.cursor(
        ["packetEditor", "packet"].concat(keyPath)
      );

      parentKeyPathCursor.set(newKey, undefined);
    },
    removeFieldFromParent: function (keyPath) {
      console.log("REMOVE ", keyPath);
      var parentKeyPathCursor = stateTree.cursor(
        ["packetEditor", "packet"].concat(keyPath.slice(0, -1))
      );

      parentKeyPathCursor.delete(keyPath[keyPath.length - 1]);
    },
    toggleOpen: function(keyPath) {
      var openedKeyPathCursor = stateTree.cursor(
        ["packetEditor", "openedKeyPaths"].concat(keyPath)
      );

      var parentKeyPathCursor = stateTree.cursor(
        ["packetEditor", "openedKeyPaths"].concat(keyPath.slice(0, -1))
      );


      if (openedKeyPathCursor.deref()) {
        parentKeyPathCursor.delete(keyPath[keyPath.length - 1]);
      } else {
        openedKeyPathCursor.update(() => Immutable.fromJS({}));
      }
    },
    clearPacket: function() {
      stateTree.cursor(['packetEditor']).update(_ => {
        return Immutable.fromJS({
          packet: {
            to: 'root',
            type: 'requestTypes'
          },
          openedKeyPaths: {}
        });
      });
    },
    sendPacket: function(packet) {
      postChromeMessage("send-new-packet", JSON.stringify(packet));
    },
    togglePopover: function(popover) {
      var oldPopover = stateTree.cursor(['currentPopover']).deref();
      if (oldPopover && oldPopover._lifeCycleState == "UNMOUNTED") {
        oldPopover = null;
      }

      if (oldPopover) {
        oldPopover.hide();
      }

      stateTree.cursor(['currentPopover']).update(_ => popover);
      if (popover) {
        popover.toggle();
      }
    }
  };

  // Event Listeners Registration
  window.addEventListener("devtools:select", onSelect);

  React.render(PacketEditor({ reference: stateTree.reference(['packetEditor']),
                              actions: packetEditorActions }), document.body);

  function onSelect(event) {
    try {
      packetEditorActions.setPacket(JSON.parse(event.data));
    } catch(e) {
      console.log("EDITOR EXCEPTION", e);
    }
  }

});
