/* See license.txt for terms of usage */
"use strict";

const { Loader } = require("sdk/test/loader");
const loader = Loader(module);
const { startServerAsync } = loader.require("addon-httpd");
const { pathFor } = require("sdk/system");

const file = require("sdk/io/file");
const basePath = pathFor("ProfD");
const port = 8099;
const host = "http://localhost:" + port + "/";

function serve({ name, content, pathHandler }) {
  content = content || "<html><head><title>" + name +
    "</title></head><body></body></html>";

  let server = startServerAsync(port, basePath);

  if (pathHandler) {
    server.registerPathHandler("/" + name + ".html", pathHandler);
  } else {
    let pagePath = file.join(basePath, name + ".html");
    let pageStream = file.open(pagePath, "w");
    pageStream.write(content);
    pageStream.close();
  }

  return server;
}

exports.serve = serve;
exports.host = host;
