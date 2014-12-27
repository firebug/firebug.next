/* See license.txt for terms of usage */

"use strict";

const { Trace, TraceError } = require("../core/trace.js").get(module.id);

// Implementation
var Arr = {};

Arr.isArrayLike = function(obj) {
  try {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    if (!isFinite(obj.length)) {
      return false;
    }
    if (Array.isArray(obj)) {
      return true;
    }

    // This handles jQuery etc.
    // xxxsz: That's rather a hack. We should find a better approach for this.
    if (typeof obj.splice === "function") {
      return true;
    }

    let str = Object.prototype.toString.call(obj);
    if (str === "[object HTMLCollection]" || str === "[object NodeList]" ||
        str === "[object DOMTokenList]" || str === "[object Arguments]") {
      return true;
    }
  } catch (exc) {
  }

  return false;
};

Arr.values = function(map) {
  let values = [];
  try {
    for (let name in map) {
      try {
        values.push(map[name]);
      } catch (exc) {
        // Sometimes we get exceptions trying to access properties
        TraceError.sysout("lib.values FAILED ", exc);
      }
    }
  } catch (exc) {
    // Sometimes we get exceptions trying to iterate properties
    TraceError.sysout("lib.values FAILED ", exc);
  }

  return values;
};

Arr.remove = function(list, item) {
  for (let i = 0; i < list.length; ++i) {
    if (list[i] == item) {
      list.splice(i, 1);
      return true;
    }
  }
  return false;
};

Arr.cloneArray = function(array, fn) {
  if (!array) {
    return array;
  }

  let newArray = [], len = array.length;

  if (fn) {
    for (let i = 0; i < len; ++i)
      newArray.push(fn(array[i]));
  } else {
    for (let i = 0; i < len; ++i)
      newArray.push(array[i]);
  }

  return newArray;
};

Arr.arrayInsert = function(array, index, other) {
  // Prepare arguments for Array.splice()
  // 1) index: at which to start inserting the 'other' array.
  // 2) howMany: elements to remove (none in this case)
  // 3-N) elements: to insert
  let args = [index, 0];
  args.push.apply(args, other);

  // Insert 'other' array into 'array'
  array.splice.apply(array, args);

  return array;
};

//xxxFlorent: [ES6-SET] [ES6-SPREAD]
/**
 * Filter out unique values of an array, saving only the first occurrence of
 * every value. In case the array is sorted, a faster path is taken.
 */
Arr.unique = function(ar, sorted) {
  let ret = [], len = ar.length;
  if (sorted) {
    for (let i = 0; i < len; ++i) {
      // Skip duplicated entries
      if (i && ar[i-1] === ar[i]) {
        continue;
      }
      ret.push(ar[i]);
    }
  }
  else {
    let set = new Set();
    for (let i = 0; i < len; ++i) {
      if (!set.has(ar[i])) {
        ret.push(ar[i]);
        set.add(ar[i]);
      }
    }
  }
  return ret;
};

/**
 * Sort an array and eliminate duplicates from it.
 */
Arr.sortUnique = function(ar, sortFunc) {
  return Arr.unique(ar.slice().sort(sortFunc), true);
};

/**
 * Merge together two arrays, sort the result, and eliminate any duplicates.
 */
Arr.merge = function(arr1, arr2, sortFunc) {
  return Arr.sortUnique(arr1.concat(arr2), sortFunc);
};

// Exports from this module
exports.Arr = Arr;
