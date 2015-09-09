/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Implementation
function XhrStore() {
  this.onContentMessage = this.onContentMessage.bind(this);

  addEventListener("firebug/chrome/message", this.onContentMessage);

  this.requests = new Map();
  this.spies = new Map();
}

/**
 * 
 */
XhrStore.prototype =
/** @lends XhrStore */
{
  requestData: function(actor, method) {
    Trace.sysout("XhrStore.requestData; for: " +
      actor + ": " + method);

    this.postChromeMessage("requestData", {
      actor: actor,
      method: method
    });
  },

  // Communication Channel

  onContentMessage: function(event) {
    var data = event.data;
    var args = data.args;

    Trace.sysout("XhrStore.onContentMessage; " + data.type + ", " +
      args.method, event);

    switch (data.type) {
      case "requestData":
      this.onRequestData(args.method, args.response);
      break;
    }

    // Refresh the Spy object, but we should properly dispatch
    // an event.
    var spy = this.spies.get(args.response.from);
    if (spy) {
      spy.refresh();
    }
  },

  postChromeMessage: function(type, args) {
    var data = {
      type: type,
      args: args
    };

    var event = new MessageEvent("firebug/content/message", {
      bubbles: true,
      cancelable: true,
      data: data,
    });

    dispatchEvent(event);
  },

  // XHR Spies

  getFile: function(actor) {
    var spy = this.spies.get(actor);
    if (spy) {
      return spy.log;
    }
  },

  // Message Handlers

  onRequestData: function(method, response) {
    var spy = this.spies.get(response.from);
    if (!spy) {
      return;
    }

    switch (method) {
      case "requestHeaders":
        this.onRequestHeaders(response);
        break;
      case "responseHeaders":
        this.onResponseHeaders(response);
        break;
      case "requestCookies":
        this.onRequestCookies(response);
        break;
      case "responseContent":
        this.onResponseContent(response);
        break;
      case "requestPostData":
        this.onRequestPostData(response);
        break;
    }
  },

  onRequestHeaders: function(response) {
    var file = this.getFile(response.from);
    file.request.headers = response.headers;

    this.getLongHeaders(file.request.headers);
  },

  onResponseHeaders: function(response) {
    var file = this.getFile(response.from);
    file.response.headers = response.headers;

    this.getLongHeaders(file.response.headers);
  },

  onResponseContent: function(response) {
    var file = this.getFile(response.from);
    var content = response.content;

    file.response.content.text = content.text;
    file.response.content.transferredSize = content.transferredSize;
    file.response.content.size = content.size;

    // Resolve long string xxxHonza
    /*var text = response.content.text;
    if (typeof text == "object") {
      this.getLongString(text).then(value => {
        response.content.text = value;
      })
    }*/
  },

  onRequestPostData: function(response) {
    var file = this.getFile(response.from);
    file.request.postData = response.postData;
  },

  getLongHeaders: function(headers) {
    // xxxHonza: TODO
    return headers;
  }
};

// Exports from this module
exports.XhrStore = new XhrStore();
});
