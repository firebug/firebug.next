/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc, CC } = require("chrome");
const { Trace, TraceError } = require("../../core/trace.js").get(module.id);
const { Options } = require("../../core/options.js");
const { Locale } = require("../../core/locale.js");
const { Win } = require("../../core/window.js");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");
const { HarBuilder } = require("./har-builder.js");
const { HarViewer } = require("./har-viewer.js");

const Clipboard = require("sdk/clipboard");

// Platform Services
const nsIFilePicker = Ci.nsIFilePicker;
const ZipWriter = CC("@mozilla.org/zipwriter;1", "nsIZipWriter");
const LocalFile = new CC("@mozilla.org/file/local;1", "nsILocalFile", "initWithPath");

// DownThemAll: https://addons.mozilla.org/en-US/firefox/addon/downthemall/
// This extension is used to download and save all page resources
// as separate files.
// See also: 'extensions.firebug.netexport.saveFiles' option.
var DTA = {};
try {
  Cu.import("resource://dta/api.jsm", DTA);
} catch (err) {
  DTA = null;
}

const OPEN_FLAGS = {
  RDONLY: parseInt("0x01"),
  WRONLY: parseInt("0x02"),
  CREATE_FILE: parseInt("0x08"),
  APPEND: parseInt("0x10"),
  TRUNCATE: parseInt("0x20"),
  EXCL: parseInt("0x80")
};

// HAR
const harVersion = "1.1";

/**
 * This object is responsible for exporting Network panel data into HAR file.
 * It uses {HarBuilder} to build proper JSON from collected data.
 *
 * xxxHonza: TODO FIXME
 * 1. DONE support for auto-export needed
 * 2. DONE expose NetExport to the content scope
 * 3. DONE support for all existing prefs
 * 4. support for custom file names
 */
var Exporter =
/** @lends Exporter */
{
  manualExportData: function(context, jsonp, items) {
    Trace.sysout("Exporter.manualExportData;", items);

    let file;

    if (items.length > 0) {
      // Get target file for exported data. Bail out, if the user
      // presses cancel.
      file = this.getTargetFile(context, jsonp);
      if (!file) {
        return;
      }
    }

    return this.exportData(context, jsonp, items, file);
  },

  exportData: function(context, jsonp, items, file) {
    Trace.sysout("Exporter.exportData;", items);

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

    this.saveToFile(file, jsonString, context);

    if (Options.get("netexport.saveFiles")) {
      this.saveFiles(context, json, file);
    }

    if (Options.get("netexport.showPreview")) {
      let viewerURL = Options.get("netexport.viewerURL");
      if (viewerURL) {
        HarViewer.open(viewerURL, jsonStringForViewer);
      }
    }
  },

  buildHAR: function(context, jsonp, items) {
    let json = this.buildJSON(context, items);

    Trace.sysout("Exporter.buildHAR;", json);

    let jsonString = this.buildData(json);
    if (!jsonString) {
      return;
    }

    // If JSONP is wanted, wrap the string in a function call
    if (jsonp) {
      let callbackName = Options.get("netexport.jsonpCallback");

      // This callback name is also used in HAR Viewer by default.
      // http://www.softwareishard.com/har/viewer/
      if (!callbackName)
        callbackName = "onInputData";

      jsonString = callbackName + "(" + jsonString + ");";
    }

    return jsonString;
  },

  copyData: function(context, jsonp, items) {
    Trace.sysout("exporter.copyData;");

    let jsonString = this.buildHAR(context, jsonp, items);
    if (jsonString) {
      Clipboard.set(jsonString, "text");
    }
  },

  // Open File Save As dialog and let the user to pick proper file location.
  getTargetFile: function(context, jsonp) {
    let browser = getMostRecentBrowserWindow();

    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
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
      Trace.sysout("Exporter.buildData; Exported data:", jsonData);

      return jsonString;
    }
    catch (err) {
      TraceError.sysout("Exporter.exportData; EXCEPTION " + err, err);
    }
  },

  // Save JSON string into a file.
  saveToFile: function(file, jsonString, context) {
    let openFlags = OPEN_FLAGS.WRONLY | OPEN_FLAGS.CREATE_FILE |
      OPEN_FLAGS.TRUNCATE;

    try {
      let foStream = Cc["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Ci.nsIFileOutputStream);

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
      TraceError.sysout("Exporter.saveToFile; ERROR Failed to export " +
        "net data " + err, err);
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
      Trace.sysout("Exporter.saveToFile; Zipping log file " + file.path);

      // Rename using unique name (the file is going to be removed).
      file.moveTo(null, "temp" + (new Date()).getTime() + "temphar");

      // Create compressed file with the original file path name.
      let zipFile = Cc["@mozilla.org/file/local;1"].
        createInstance(Ci.nsILocalFile);
      zipFile.initWithPath(originalFilePath);

      // The file within the zipped file doesn't use .zip extension.
      let fileName = originalFileName;
      if (fileName.indexOf(".zip") == fileName.length - 4) {
        fileName = fileName.substr(0, fileName.indexOf(".zip"));
      }

      // But if there is no .har extension - append it.
      //if (fileName.indexOf(extension) != fileName.length - 4) {
      //  fileName += extension;
      //}

      let zip = new ZipWriter();
      zip.open(zipFile, openFlags);
      zip.addEntryFile(fileName, Ci.nsIZipWriter.COMPRESSION_DEFAULT,
        file, false);
      zip.close();

      // Remove the original file (now zipped).
      file.remove(true);
      return true;
    } catch (err) {
      TraceError.sysout("Exporter.saveToFile; ERROR Failed to zip log file " +
        err.toString());

      // Something went wrong (disk space?) rename the original file back.
      file.moveTo(null, originalFileName);
    }

    return false;
  },

  // Save Files

  saveFiles: function(context, json, file) {
    if (!DTA) {
      return;
    }

    json = json.log.entries;

    // Populate the URL list and remove 404s.
    var fileList = [];
    var entryLength = json.length;
    for (var i=0; i<entryLength; i++) {
      var entry = json[ i ];
      var entryStatus = entry.response.status;
      var entryURL = entry.request.url;

      if (!(entryStatus === 404)) {
        fileList[fileList.length] = entryURL;
      }

      if (Trace.active) {
        let out = entryURL + " " + entryStatus;
        if (entryStatus === 404) {
          out += " -- skipped 404";
        }
        Trace.sysout(out);
      }
    }

    // Remove duplicates.
    fileList = this.uniq(fileList.sort());
    var fileListLength = fileList.length;

    // File path is from the Save As dialog.
    var filePath = file.path;
    var defaultFolderName = this.getDefaultFileName(context) + "_files";

    // Create DTA saveFile objects.
    for (var i=0; i<fileListLength; i++) {
      fileList[i] = this.saveFile(filePath, defaultFolderName, fileList[i]);
    }

    // Automatically download all files in the list.
    let browser = getMostRecentBrowserWindow();
    DTA.sendLinksToManager(browser, true, fileList);
  },

  // in_arr must be sorted.
  uniq: function(_in) {
    var out = [_in[0]];
    var old = _in[0];
    var _inLength = _in.length;

    for (var a=1; a<_inLength; a++) {
      var _new = _in[a];
      if (_new === old) {
        continue;
      }

      out[out.length] = _in[a];
      old = _new;
    }
    return out;
  },

  saveFile: function(filePath, defaultFolderName, url) {
    var aURL = url;
    var rgx_file_from_system_path = /[\/\\]([^\/\\]+)$/;

    var dirSave = new LocalFile(filePath.replace(rgx_file_from_system_path, ""));
    dirSave.append(defaultFolderName);

    // Match from the start until one or more '/' are found.
    // http://example.com/ => "http://"
    var rgx_url_protocol = /^[^\/]+\/+/;
    url = url.replace( rgx_url_protocol, "");

    var rgx_slash_after_question = /\?[^\/]+\//;
    // Doesn't work with slashes after a question mark.
    // http://example.com/folder/file.ext?a=b&c=/ => ""
    // Match from the last / to the end of the string.
    var rgx_file_from_url = /\/([^\/]+)$/;

    // If there's a '/' after a '?' then remove the query string.
    if (url.match( rgx_slash_after_question )) {
      //  http://example.com/folder/file.ext?a=b&c=/ =>
      // "http://example.com/folder/file.ext"
      // Match from the start until a ? is found.
      var rgx_before_query_string = /^[^\?]+/;
      url = url.match( rgx_before_query_string )[ 0 ].
        replace( rgx_file_from_url, "" );
    } else {
      url = url.replace( rgx_file_from_url, "" );
    }

    // Note: String.trim() is moz-1.9.1+ (FX 3.5)
    // Supported DTA has this as minimum requirement anyway.
    var parts = url.split(/[\/\\]+/).map(function(e){
      return e.trim();
    });

    for each (var part in parts) {
      if (part) {
        dirSave.append(part);
      }
    }

    return {
      "url": aURL,
      "numIstance": 0,
      "referrer": null,
      "description": "",
      "title": "",
      "mask": "*name*.*ext*",
      "dirSave": dirSave.path
    };
  },
}

// Exports from this module
exports.Exporter = Exporter;
