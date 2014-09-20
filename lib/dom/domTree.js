/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { Domplate, setElementData } = require("../core/domplate.js");
const { Dom } = require("../core/dom.js");
const { Events } = require("../core/events.js");
const { Reps } = require("../reps/reps.js");

const { domplate, TR, TD, TABLE, TBODY, FOR, TAG, SPAN } = Domplate;

// DOM Tree Implementation
function DomTree(provider) {
  this.provider = provider;
}

/**
 * @domplate This object represents generic DomTree widget based on Domplate.
 * You can use data provider to populate the tree with custom data.
 * Or just pass a JS object as an input.
 */
DomTree.prototype = domplate(
/** @lends DomTree */
{
  sizerRowTag:
    TR({role: "presentation"},
      TD({width: "30%"}),
      TD({width: "70%"})
    ),

  tag:
    TABLE({"class": "domTable", cellpadding: 0, cellspacing: 0,
      onclick: "$onClick"},
      TBODY(
        TAG("$object|getSizerRowTag"),
        FOR("member", "$object|memberIterator",
            TAG("$member|getRowTag", {member: "$member"}))
      )
    ),

  rowTag:
    TR({"class": "memberRow $member.open $member.type\\Row",
      _repObject: "$member",
      $hasChildren: "$member|hasChildren",
      $repIgnore: true,
      level: "$member.level"},
      TD({"class": "memberLabelCell", style: "padding-left: $member|getIndent\\px"},
        SPAN({"class": "memberLabel $member.type\\Label"}, "$member|getLabel")
      ),
      TD({"class": "memberValueCell"},
        TAG("$member|getValueTag", {object: "$member|getValue"})
      )
    ),

  loop:
    FOR("member", "$members",
      TAG("$member|getRowTag", {member: "$member"})),

  // Domplate Accessors

  getRowTag: function(member) {
    return this.rowTag;
  },

  getSizerRowTag: function(object) {
    return this.sizerRowTag;
  },

  hasChildren: function(member) {
    return member.hasChildren ? "hasChildren" : "";
  },

  getIndent: function(member) {
    return member.level * 16;
  },

  getLabel: function(member) {
    if (member.provider)
      return member.provider.getLabel(member.value);

    return member.name;
  },

  getValue: function(member) {
    // xxxHonza: |this| is wrong at this moment (callback from Domplate
    // uses wrong context).
    // That's why we access the provider through the 'member' object.
    // xxxHonza: It should be possible to provide the tag through
    // a decorator or provider.
    if (member.provider)
    {
      // Get proper template for the value. |member.value| should refer
      // to remote object implementation.
      // xxxHonza: the value should be always available synchronously.
      try {
        var value = member.provider.getValue(member.value);
        if (isPromise(value))
          return member.tree.resolvePromise(value, member.value);
        return value;
      }
      catch (err) {
        Trace.sysout("domTree.getValue; EXCEPTION " + err, err);
      }
    }

    return member.value;
  },

  getValueTag: function(member) {
    // xxxHonza: if value is fetched asynchronously and the actual return value
    // here is a promise the tree should probably use a generic template with
    // a throbber and wait for async update.

    // xxxHonza: what about this.provider.getRep or getType?
    var value = this.getValue(member);
    var rep = Reps.getRep(value);
    return rep.shortTag ? rep.shortTag : rep.tag;
  },

  // Domplate Event Handlers

  onClick: function(event) {
    if (!Events.isLeftClick(event))
      return;

    var target = event.target;
    var row = Dom.getAncestorByClass(target, "memberRow");
    var label = Dom.getAncestorByClass(event.target, "memberLabel");
    if (label && row.classList.contains("hasChildren"))
        this.toggleRow(row);

    Events.cancelEvent(event);
  },

  toggleRow: function(row, forceOpen) {
    if (!row)
      return;

    var member = Reps.getRepObject(row);
    if (!member) {
      TraceError.sysout("domTree.toggleRow; ERROR no member!");
      return;
    }

    var level = this.getRowLevel(row);
    if (forceOpen && row.classList.contains("opened"))
      return;

    // Handle child items expanding and collapsing.
    if (row.classList.contains("opened")) {
      row.classList.remove("opened");

      var tbody = row.parentNode;
      for (var firstRow = row.nextSibling; firstRow;
        firstRow = row.nextSibling) {
        if (this.getRowLevel(firstRow) <= level)
          break;

        tbody.removeChild(firstRow);
      }
    }
    else {
      // Do not expand if the member says there are no children.
      if (!member.hasChildren)
        return;

      row.classList.add("opened");

      // Get children object for the next level.
      var members = this.getMembers(member.value, level + 1);

      Trace.sysout("DomTree.toggleRow; level: " + level + ", members: " +
        (members ? members.length : "null"), members);

      // Insert rows if they are immediately available. Otherwise set a spinner
      // and wait for the update.
      if (members && members.length) {
        this.loop.insertRows({members: members}, row, this);
      }
      else if (isPromise(members)) {
        row.classList.add("spinning");
        return members;
      }
    }
  },

  getRowLevel: function(row) {
    return parseInt(row.getAttribute("level"), 10);
  },

  memberIterator: function(object) {
    var members = this.getMembers(object);

    // The expected return value from this method is an array,
    // so make sure not to return a promise. The children list
    // will be updated automatically as soon as the promise
    // is resolved.
    return isPromise(members) ? [] : members;
  },

  getMembers: function(object, level) {
    if (!level)
      level = 0;

    var members;

    // If a member provider is available use it to create all tree members.
    // Note that these member objects are directly consumed by Domplate
    // templates.
    if (this.memberProvider)
      members = this.memberProvider.getMembers(object, level);

    if (members)
      return members;

    members = [];

    // Create default members for children coming from a data provider
    // or for properties of given object if data provider is not available.
    if (this.provider) {
      // Children can be provided asynchronously. In case of an update
      // (children has been asynchronously received), children are available
      // as fetchedChildren prop, so we should use them directly.
      let children = this.fetchedChildren || this.fetchChildren(object);
      this.fetchedChildren = null;

      // If the return value is a promise, bail out and wait for
      // asynchronous update (children will be passed in as an
      // argument later).
      if (isPromise(children))
        return children;

      for (var i=0; i<children.length; i++) {
        var child = children[i];
        var hasChildren = this.provider.hasChildren(child);
        var type = this.getType(child);

        // We can't use DomTree.getLabel() at this moment since it
        // expects a member
        // object as the argument. But the member doesn't exist yet
        // (it's going to
        // be created at the next row). So, derived objects should not override
        // getLabel() method, but rather provide custom provider.
        var name = this.provider.getLabel(child);

        // Create a member object that represents row-value descriptor.
        // Every row in the
        // tree is associated (via repObject) with an instance of this meta
        // structure.
        // You might want to override this method in derived tree objects
        // to provide
        // custom meta-data.
        var member = this.createMember(type, name, child, level, hasChildren);
        member.provider = this.provider;

        // Domplate inheritance doesn't work properly so, let's store
        // back reference.
        member.tree = this;
        members.push(member);
      }
    }
    else {
      this.getObjectProperties(object, function(prop, value) {
        var valueType = typeof(value);
        var hasChildren = (valueType === "object" && this.hasProperties(value));
        var type = this.getType(value);

        var member = this.createMember(type, prop, value, level, hasChildren);
        members.push(member);
      });
    }

    return members;
  },

  fetchChildren: function(object) {
    var children = [];

    try {
      children = this.provider.getChildren(object);
    }
    catch (e) {
      TraceError.sysout("domTree.fetchChildren; EXCEPTION " + e, e);
      return children;
    }

    if (isPromise(children))
      return this.resolvePromise(children, object);

    return children;
  },

  getType: function(object) {
    // xxxHonza: A type provider (or a decorator) should be used here.
    // (see also a comment in {@WatchTree.getType}
    return "dom";
  },

  createMember: function(type, name, value, level, hasChildren) {
    var member = {
      name: name,
      type: type,
      rowClass: "memberRow-" + type,
      open: "",
      level: level,
      hasChildren: hasChildren,
      value: value,
    };

    return member;
  },

  // Object Properties

  hasProperties: function(obj) {
    if (typeof(obj) == "string")
      return false;

    try {
      for (var name in obj)
          return true;
    }
    catch (exc) {
    }

    return false;
  },

  getObjectProperties: function(obj, callback) {
    for (var p in obj) {
      try {
        callback.call(this, p, obj[p]);
      }
      catch (e) {
        TraceError.sysout("domTree.getObjectProperties; EXCEPTION " + e, e);
      }
    }
  },

  getRow: function(object) {
    // If not rendered yet, bail out.
    if (!this.element)
      return;

    // Iterate all existing rows and expand the one associated with
    // specified object.
    // The repObject is a "member" object created in createMember method.
    var rows = this.element.querySelectorAll(".memberRow");
    for (var i=0; i<rows.length; i++) {
      var row = rows[i];
      var member = Reps.getRepObject(row);
      if (member && member.value == object)
        return row;
    }

    return null;
  },

  getMemberRow: function(member) {
    if (!this.element)
      return;

    var rows = this.element.querySelectorAll(".memberRow");
    for (var i=0; i<rows.length; i++) {
      var row = rows[i];
      if (member == Reps.getRepObject(row))
        return row;
    }

    return null;
  },

  resolvePromise: function(promise, object) {
    var result;

    // This flag is used to differentiate sync and async scenario.
    var sync = true;

    // The callback can be executed immediately if children are provided
    // synchronously. In such case, 'arr' is immediately used as the
    // result value.
    // The object (i.e. the associated row) is updated later in
    // asynchronous scenario.
    var promise = promise.then(value => {
      Trace.sysout("domTree.resolvePromise; done, sync: " + sync,
        {object: object, value: value});

      if (sync) {
        result = value;
      }
      else {
        this.fetchedChildren = value;
        this.updateObject(object);
      }
    },
    err => {
      TraceError.sysout("domTree.onResolvePromise; ERROR " + err, err);
    });

    sync = false;

    return result || promise;
  },

  // Public

  replace: function(parentNode, input, noExpand) {
    Dom.clearNode(parentNode);
    this.append(parentNode, input, noExpand);
  },

  append: function(parentNode, input, noExpand) {
    this.parentNode = parentNode;
    this.input = input;

    this.element = this.tag.append(input, parentNode, this);
    // xxxSimon We should not be setting repObject manually.
    setElementData(this.element, "repObject", this);

    if (noExpand)
      return;

    // Expand the first node (root) by default
    // Do not expand if the root is an array with more than one element.
    // xxxHonza: doesn't work if children are fetched asynchronously
    // since the UI (rows) are not rendered yet (firstRow == null)
    var value = Array.isArray(input) && input.length > 2;
    var firstRow = this.element.firstChild.firstChild;
    if (firstRow && !value)
      this.toggleRow(firstRow);
  },

  expandMember: function(member) {
    var row = this.getMemberRow(member);
    if (row)
      return this.toggleRow(row, true);
  },

  expandObject: function(object) {
    var row = this.getRow(object);
    if (!row) {
      TraceError.sysout("domTree.expandObject; ERROR no such object", object);
      return;
    }

    return this.toggleRow(row, true);
  },

  collapseObject: function(object) {
    var row = this.getRow(object);
    if (row.classList.contains("opened"))
      this.toggleRow(row);
  },

  updateObject: function(object) {
    try {
      this.doUpdateObject(object);
    }
    catch (e) {
      TraceError.sysout("domTree.updateObject; EXCEPTION " + e, e);
    }
  },

  doUpdateObject: function(object) {
    var row = this.getRow(object);

    // The input.object itself (the root) doesn't have a row.
    if (this.input.object == object) {
      var members = this.getMembers(object);
      if (members) {
        this.loop.insertRows({members: members},
          this.element.firstChild, this);
      }
      return;
    }

    // Root will always bail out.
    if (!row) {
      Trace.sysout("domTree.updateObject; This object can't be updated",
        object);
      return;
    }

    var member = Reps.getRepObject(row);
    member.hasChildren = this.provider.hasChildren(object);

    // If the old row was expanded remember the state. We want to expand
    // it again after
    // the row itself is updated. Do not forget to remove the existing
    // child rows (by
    // collapsing the row), they will be regenerated.
    var expanded = row.classList.contains("opened");
    if (expanded)
      this.toggleRow(row);

    Trace.sysout("domTree.updateObject;", {
      object: object,
      member: member,
      row: row,
    });

    // Generate new row with new value.
    var rowTag = this.getRowTag();
    var rows = rowTag.insertRows({member: member}, row, this);

    // Remove the old row before dealing (expanding) the new updated row.
    // Otherwise the old one would be used since it's associated with
    // the same rep object.
    row.parentNode.removeChild(row);

    if (expanded) {
      // Expand if it was expanded and the flag still says there are
      // some children. Otherwise close the row.
      if (member.hasChildren)
        this.expandObject(object);
      else
        this.collapseObject(object);
    }
  },

  isEmpty: function() {
    if (!this.element)
      return true;

    var rows = this.element.querySelectorAll(".memberRow");
    return !rows.length;
  }
});

// Helpers

function isPromise(object) {
  return object && typeof(object.then) == "function";
}

// Exports from this module
exports.DomTree = DomTree;
