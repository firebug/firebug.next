/* See license.txt for terms of usage */

define(function(require, exports, module) {

const mimeExtensionMap =
{
  "html": "text/html",
  "htm": "text/html",
  "xhtml": "text/html",
  "xml": "text/xml",
  "css": "text/css",
  "js": "application/x-javascript",
  "jss": "application/x-javascript",
  "jpg": "image/jpg",
  "jpeg": "image/jpeg",
  "gif": "image/gif",
  "png": "image/png",
  "bmp": "image/bmp",
  "woff": "application/font-woff",
  "ttf": "application/x-font-ttf",
  "otf": "application/x-font-otf",
  "swf": "application/x-shockwave-flash",
  "xap": "application/x-silverlight-app",
  "flv": "video/x-flv",
  "webm": "video/webm"
};

const mimeCategoryMap =
{
  // xxxHonza: note that there is no filter for 'txt' category,
  // shell we use e.g. 'media' instead?
  "text/plain": "txt",

  "application/octet-stream": "bin",
  "text/html": "html",
  "text/xml": "html",
  "application/rss+xml": "html",
  "application/atom+xml": "html",
  "application/xhtml+xml": "html",
  "application/mathml+xml": "html",
  "application/rdf+xml": "html",
  "text/css": "css",
  "application/x-javascript": "js",
  "text/javascript": "js",
  "application/javascript" : "js",
  "text/ecmascript": "js",
  "application/ecmascript" : "js", // RFC4329
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/gif": "image",
  "image/png": "image",
  "image/bmp": "image",
  "application/x-shockwave-flash": "plugin",
  "application/x-silverlight-app": "plugin",
  "video/x-flv": "media",
  "audio/mpeg3": "media",
  "audio/x-mpeg-3": "media",
  "video/mpeg": "media",
  "video/x-mpeg": "media",
  "video/webm": "media",
  "video/mp4": "media",
  "video/ogg": "media",
  "audio/ogg": "media",
  "application/ogg": "media",
  "application/x-ogg": "media",
  "application/x-midi": "media",
  "audio/midi": "media",
  "audio/x-mid": "media",
  "audio/x-midi": "media",
  "music/crescendo": "media",
  "audio/wav": "media",
  "audio/x-wav": "media",
  "application/x-woff": "font",
  "application/font-woff": "font",
  "application/x-font-woff": "font",
  "application/x-ttf": "font",
  "application/x-font-ttf": "font",
  "font/ttf": "font",
  "font/woff": "font",
  "application/x-otf": "font",
  "application/x-font-otf": "font"
};

var XhrUtils = {}

XhrUtils.isImage = function(contentType) {
  contentType = contentType.split(";")[0];
  contentType = contentType.trim();
  return mimeCategoryMap[contentType] == "image";
}

XhrUtils.findHeader = function(headers, name) {
  if (!headers) {
    return null;
  }

  name = name.toLowerCase();
  for (var i = 0; i < headers.length; ++i) {
    var headerName = headers[i].name.toLowerCase();
    if (headerName == name) {
      return headers[i].value;
    }
  }
}

// Exports from this module
exports.XhrUtils = XhrUtils;
});
