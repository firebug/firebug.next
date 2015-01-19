/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { defer } = require("sdk/core/promise");
const { Trace, TraceError } = require("./trace.js").get(module.id);
const { System } = require("./system.js");

const { ActorRegistryFront } = System.devtoolsRequire("devtools/server/actors/actor-registry");

// Module implementation
let Rdp = {};

/**
 * xxxHonza: integrate with registerActor
 */
Rdp.registerActorNew = function(toolbox, options) {
  let deferred = defer();
  let client = toolbox.target.client;
  client.listTabs(response => {
    let registry = ActorRegistryFront(client, response);

    // Register actor.
    Rdp.registerActor(registry, client, options).then(
      ({registrarActor, actorFront}) => {

      deferred.resolve({
        registrarActor: registrarActor,
        actorFront: actorFront
      });
    });
  });

  return deferred.promise;
}

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

    let registrationNeeded = true;

    let tabForm = response.tabs[response.selected];
    if (tabActor && tabForm[typeName]) {
      Trace.sysout("rdp.registerActor; the actor " + typeName + " is " +
        "already registered as tab actor", tabForm);

      registrationNeeded = false;

      Rdp.attachActor(client, frontCtor, tabForm).then(actorFront => {
        deferred.resolve({actorFront: actorFront});
      });
    } else if (globalActor && response[typeName]) {
      Trace.sysout("rdp.registerActor; the actor " + typeName + " is " +
        "already registered as global actor", response);

      registrationNeeded = false;

      Rdp.attachActor(client, frontCtor, response).then(actorFront => {
        deferred.resolve({actorFront: actorFront});
      });
    }

    // xxxHonza: what if the actor is registered only as global
    // and now it's also marked as a tab actor?
    if (registrationNeeded) {
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
    }
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

