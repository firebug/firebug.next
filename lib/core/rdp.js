/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { defer } = require("sdk/core/promise");
const { Trace, TraceError } = require("./trace.js").get(module.id);
const { System } = require("./system.js");

// xxxHonza: Firefox 36+
const { ActorRegistryFront } = System.devtoolsRequire("devtools/server/actors/actor-registry");

// xxxHonza: Firefox 37+
const { registerActor } = System.devtoolsRequire("devtools/server/actors/utils/actor-registry-utils");

// Module implementation
let Rdp = {};

/**
 * TODO: docs
 */
Rdp.registerActor = function(client, options) {
  let deferred = defer();
  let frontCtor = options.frontClass;
  let typeName = frontCtor.prototype.typeName;
  let moduleUrl = options.moduleUrl;

  // Dynamic actor installation using ActorRegistryFront doesn't support
  // e10s yet. Also the registry actor has been introduced in Firefox 36
  // Firefox 37 introduces support for e10s (use registerActor method for
  // the feature detection).
  let notSupported = typeof registerActor == "undefined";
  if (System.isMultiprocessEnabled() && notSupported) {
    TraceError.sysout("logging.onToolboxReady; ERROR e10s is not " +
      "supported in this browser version. Try Firefox 37+");
    deferred.resolve({});
    return;
  }

  // ActorRegistryFront has been introduced in Firefox 36
  if (typeof ActorRegistryFront == "undefined") {
    TraceError.sysout("logging.onToolboxReady; ERROR dynamic actor " +
      "registration has been introduced in Firefox 36");
    deferred.resolve({});
    return;
  }

  // First ask for list of tabs to check out whether the actor is
  // already registered or not.
  // xxxHonza: there should be a cache for 'listTabs' response
  // to reduce number or 'listTabs' requests sent to the backend.
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

      // Get or create front object for the registry actor.
      // This actor is used to register other actors.
      // There must be just one instance of a front object (aka client)
      // for given backend actor.
      let registry = client.getActor(response["actorRegistryActor"]);
      if (!registry) {
        registry = ActorRegistryFront(client, response);
      }

      // Register the custom actor on the backend.
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

  // xxxHonza: Sometimes we don't need the front (e.g. in case
  // on backend monitors), so attach would be just good enough.
  // Do not instantiated the front object if it isn't in the
  // config object.
  let actorFront = frontCtor(client, form);
  actorFront.attach().then(() => {
    deferred.resolve(actorFront);
  });

  return deferred.promise;
}

// Exports from this module
exports.Rdp = Rdp;

