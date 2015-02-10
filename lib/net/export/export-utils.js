/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");

// Services
const dirService = Cc["@mozilla.org/file/directory_service;1"].
  getService(Ci.nsIProperties);

/**
 * TODO: docs
 */
var ExportUtils =
/** @lends ExportUtils */
{
  getDefaultFolder: function() {
    let dir;
    let path = Options.get("netexport.defaultLogDir");

    if (!path) {
      // Create default folder for automated net logs.
      dir = dirService.get("ProfD", Ci.nsILocalFile);
      dir.append("firebug");
      dir.append("netexport");
      dir.append("logs");
    } else {
      dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      dir.initWithPath(path);
    }

    return dir;
  },

  onDefaultLogDir: function(event) {
    // Open File dialog and let the user to pick target directory for automated logs.
    let nsIFilePicker = Ci.nsIFilePicker;
    let fp = Cc["@mozilla.org/filepicker;1"].getService(nsIFilePicker);
    fp.displayDirectory = this.getDefaultFolder();

    //xxxHonza: localization
    fp.init(event.view, "Select target folder for automated logs:",
      nsIFilePicker.modeGetFolder);

    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      Options.set("netexport.defaultLogDir", fp.file.path);
    }
  },
}

// Exports from this module
exports.ExportUtils = ExportUtils;
