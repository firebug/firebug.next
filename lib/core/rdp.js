/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { defer } = require("sdk/core/promise");

// Module implementation
let Rdp = {};

/**
 * TODO: docs
 */
Rdp.registerActor = function(registry, client, options) {
  let deferred = defer();
  let frontCtor = options.frontClass;
  let typeName = frontCtor.prototype.typeName;
  let moduleUrl = options.moduleUrl;

  // First ask for list of tabs to check out whether the actor is
  // already registered or not.
  client.listTabs(response => {
    let tabActor = options.type.tab;
    let globalActor = options.type.global;

    let tabForm = response.tabs[response.selected];
    if (tabActor && tabForm[typeName]) {
      Trace.sysout("rdp.registerActor; the actor " + typeName + " is " +
        "already registered as tab actor", tabForm);

      Rdp.attachActor(client, frontCtor, tabForm).then(actorFront => {
        deferred.resolve({actorFront: actorFront});
      });
    } else if (globalActor && response[typeName]) {
      Trace.sysout("rdp.registerActor; the actor " + typeName + " is " +
        "already registered as global actor", response);

      Rdp.attachActor(client, frontCtor, response).then(actorFront => {
        deferred.resolve({actorFront: actorFront});
      });
    }

    let config = {
      prefix: options.prefix,
      constructor: options.actorClass,
      type: options.type,
    };

    // Register the actor on the backend.
    registry.registerActor(moduleUrl, config).then(registrarActor => {
      Trace.sysout("rdp.registerActor; registration done: " +
        moduleUrl, registrarActor);

      client.listTabs(response => {
        let form = tabActor ? response.tabs[response.selected] : response;
        Rdp.attachActor(client, frontCtor, form).then(actorFront => {
          Trace.sysout("rdp.registerActor; attach done: " +
            moduleUrl, actorFront);

          // registrarActor object is used for unregistration.
          // actorFront object is used as the client on the client side.
          deferred.resolve({
            registrarActor: registrarActor,
            actorFront: actorFront
          });
        });
      });
    });
  });

  return deferred.promise;
}

/**
 * TODO: docs
 */
Rdp.attachActor = function(client, frontCtor, form) {
  let deferred = defer();

  let actorFront = frontCtor(client, form);
  actorFront.attach().then(() => {
    deferred.resolve(actorFront);
  });

  return deferred.promise;
}

// Exports from this module
exports.Rdp = Rdp;

