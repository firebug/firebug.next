/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { Locale } = require("../../core/locale.js");
const { Win } = require("../../core/window.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { HarBuilder } = require("./har-builder.js");

const Clipboard = require("sdk/clipboard");

const nsIFilePicker = Ci.nsIFilePicker;

const harVersion = "1.1";

const OPEN_FLAGS = {
  RDONLY: parseInt("0x01"),
  WRONLY: parseInt("0x02"),
  CREATE_FILE: parseInt("0x08"),
  APPEND: parseInt("0x10"),
  TRUNCATE: parseInt("0x20"),
  EXCL: parseInt("0x80")
};

/**
 * This object is responsible for exporting Network panel data into HAR file.
 * It uses {HarBuilder} to build proper JSON from collected data.
 *
 * xxxHonza: TODO FIXME
 * 1. support for auto-export needed
 * 2. expose NetExport to the content scope
 * 3. support for all existing prefs
 * 4. support for custom file names
 */
var Exporter =
/** @lends Exporter */
{
  exportData: function(context, jsonp, items) {
    Trace.sysout("exporter.exportData", items);

    let file;

    if (items.length > 0) {
      // Get target file for exported data. Bail out, if the user
      // presses cancel.
      file = this.getTargetFile(context, jsonp);
      if (!file) {
        return;
      }
    }

    // Build JSON result string. If the panel is empty a dialog with
    // warning message
    // automatically appears.
    let json = this.buildJSON(context, items);
    let jsonString = this.buildData(json);
    if (!jsonString) {
      return;
    }

    // Remember the original JSON for the viewer (in case it's changed
    // to JSONP)
    let jsonStringForViewer = jsonString;

    // If JSONP is wanted, wrap the string in a function call
    if (jsonp) {
      let callbackName = Options.get("netexport.jsonpCallback");

      // This callback name is also used in HAR Viewer by default.
      // http://www.softwareishard.com/har/viewer/
      if (!callbackName)
        callbackName = "onInputData";

      jsonString = callbackName + "(" + jsonString + ");";
    }

    if (!this.saveToFile(file, jsonString, context, jsonp)) {
      return;
    }

    if (Options.get("netexport.showPreview")) {
      let viewerURL = Options.get("netexport.viewerURL");
      if (viewerURL) {
        openViewer(viewerURL, jsonStringForViewer);
      }
    }
  },

  copyData: function(context, jsonp, items) {
    Trace.sysout("exporter.copyData;");

    let json = this.buildJSON(context, items);
    let jsonString = this.buildData(json);

    Clipboard.set(jsonString, "text");
  },

  // Open File Save As dialog and let the user to pick proper file location.
  getTargetFile: function(context, jsonp) {
    let browser = getMostRecentBrowserWindow();

    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(browser, null, nsIFilePicker.modeSave);
    fp.appendFilter("HTTP Archive Files","*.har; *.harp; *.json; *.zip");
    fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
    fp.filterIndex = 1;

    let extension = jsonp ? ".harp" : ".har";
    let defaultFileName = this.getDefaultFileName(context) + extension;

    // Default file extension is zip if compressing is on.
    if (Options.get("netexport.compress")) {
      defaultFileName += ".zip";
    }

    fp.defaultString = defaultFileName;

    let rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      return fp.file;
    }

    return null;
  },

  getDefaultFileName: function(context) {
    return "archive";
  },

  buildJSON: function(context, items, forceExport) {
    // Export all data into a JSON string.
    let builder = new HarBuilder();
    let jsonData = builder.build(context, items);

    Trace.sysout("exporter.buildJSON; Number of entries: " +
      jsonData.log.entries.length, jsonData);

    if (!jsonData.log.entries.length && !forceExport) {
      // xxxHonza: alert(Locale.$STR("netexport.message.Nothing to export"));
      return null;
    }

    return jsonData;
  },

  // Build JSON string from the Net panel data.
  buildData: function(jsonData) {
    if (!jsonData) {
      return null;
    }

    try {
      let jsonString = JSON.stringify(jsonData, null, "  ");
      Trace.sysout("exporter.buildData; Exported data:", jsonData);

      return jsonString;
    }
    catch (err) {
      TraceError.sysout("exporter.exportData; EXCEPTION " + err, err);
    }
  },

  // Save JSON string into a file.
  saveToFile: function(file, jsonString, context, jsonp) {
    let extension = jsonp ? ".harp" : ".har";

    try {
      let foStream = Cc["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Ci.nsIFileOutputStream);

      let openFlags = OPEN_FLAGS.WRONLY |
        OPEN_FLAGS.CREATE_FILE |
        OPEN_FLAGS.TRUNCATE;

      let permFlags = parseInt("0666", 8);
      foStream.init(file, openFlags, permFlags, 0);

      let convertor = Cc["@mozilla.org/intl/converter-output-stream;1"]
        .createInstance(Ci.nsIConverterOutputStream);
      convertor.init(foStream, "UTF-8", 0, 0);

      // The entire jsonString can be huge so, write the data in chunks.
      let chunkLength = 1024 * 1204;
      for (let i=0; i<=jsonString.length; i++) {
        let data = jsonString.substr(i, chunkLength+1);
        if (data) {
          convertor.writeString(data);
        }

        i = i + chunkLength;
      }

      // this closes foStream
      convertor.close();
    } catch (err) {
      TraceError.sysout("netexport.Exporter; Failed to export net data " +
        err, err);
      return false;
    }

    // If no compressing then bail out.
    if (!Options.get("netexport.compress")) {
      return true;
    }

    // Remember name of the original file, it'll be replaced by a zip file.
    let originalFilePath = file.path;
    let originalFileName = file.leafName;

    try {
      Trace.sysout("netexport.Exporter; Zipping log file " + file.path);

      // Rename using unique name (the file is going to be removed).
      file.moveTo(null, "temp" + (new Date()).getTime() + extension);

      // Create compressed file with the original file path name.
      let zipFile = CCIN("@mozilla.org/file/local;1", "nsILocalFile");
      zipFile.initWithPath(originalFilePath);

      // The file within the zipped file doesn't use .zip extension.
      let fileName = originalFileName;
      if (fileName.indexOf(".zip") == fileName.length - 4) {
        fileName = fileName.substr(0, fileName.indexOf(".zip"));
      }

      // But if there is no .har extension - append it.
      if (fileName.indexOf(extension) != fileName.length - 4) {
        fileName += extension;
      }

      let zip = new ZipWriter();
      zip.open(zipFile, openFlags);
      zip.addEntryFile(fileName, Ci.nsIZipWriter.COMPRESSION_DEFAULT,
        file, false);
      zip.close();

      // Remove the original file (now zipped).
      file.remove(true);
      return true;
    } catch (err) {
      TraceError.sysout("netexport.Exporter; Failed to zip log file " +
        err.toString());

      // Something went wrong (disk space?) rename the original file back.
      file.moveTo(null, originalFileName);
    }

    return false;
  },
}

// Exports from this module
exports.Exporter = Exporter;
