/* See license.txt for terms of usage */

"use strict";

var self = require("sdk/self");

const { Cu, Ci } = require("chrome");
const { Trace } = require("../core/trace.js");
const { loadSheet } = require("sdk/stylesheet/utils");

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

var enumerator = Services.wm.getEnumerator("navigator:browser");
while (enumerator.hasMoreElements()) {
    loadStylesheet(enumerator.getNext());
}

var windowWatcher =
{
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver]),
    observe: function windowWatcher(win, topic, data) {
        // https://bugzil.la/795961 ?
        win.addEventListener("load", function onLoad(evt) {
            // load listener not necessary once https://bugzil.la/800677 is fixed
            var win = evt.currentTarget;
            win.removeEventListener("load", onLoad, false);
            if (win.document.documentElement.getAttribute("windowtype") == "navigator:browser")
                loadStylesheet(win);
        }, false);
    }
};

Services.obs.addObserver(windowWatcher, "chrome-document-global-created", false);

// xxxHonza: when to remove?
// Services.obs.removeObserver(windowWatcher, "chrome-document-global-created");

function loadStylesheet(win)
{
    var url = "chrome://firebug/skin/browser.css";
    loadSheet(win, url, "author");
}
