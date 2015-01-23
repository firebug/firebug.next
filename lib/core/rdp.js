/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { defer, all } = require("sdk/core/promise");
const { Trace, TraceError } = require("./trace.js").get(module.id);
const { System } = require("./system.js");

// xxxHonza: Firefox 36+
const { ActorRegistryFront } = System.devtoolsRequire("devtools/server/actors/actor-registry");

// xxxHonza: Firefox 37+
const { registerActor } = System.devtoolsRequire("devtools/server/actors/utils/actor-registry-utils");

// Module implementation
let Rdp = {};

// xxxHonza: TODO
// 1. internal optimization (number of packets exchanged) needed.
// 2. listTabs called way too often
// 3. An actor that is both global and tab can be registered in one step
//    and unregistered using one registrar object.

/**
 * TODO: docs
 */
Rdp.registerGlobalActor = function(client, options) {
  let deferred = defer();
  let frontCtor = options.frontClass;
  let typeName = frontCtor.prototype.typeName;
  let moduleUrl = options.moduleUrl;

  if (!checkCompatibility()) {
    deferred.resolve({});
    return;
  }

  client.listTabs(response => {
    // Just attach if already registered.
    if (response[typeName]) {
      Rdp.attachActor(client, frontCtor, response).then(front => {
        deferred.resolve({front: front});
      });
      return;
    }

    let config = {
      prefix: options.prefix,
      constructor: options.actorClass,
      type: { global: true },
    };

    // Make sure to use an existing front object.
    let registry = client.getActor(response["actorRegistryActor"]);
    if (!registry) {
      registry = ActorRegistryFront(client, response);
    }

    // Register the custom actor on the backend.
    registry.registerActor(moduleUrl, config).then(registrar => {
      Trace.sysout("rdp.registerGlobalActor; registration done: " +
        moduleUrl, registrar);

      client.listTabs(response => {
        Rdp.attachActor(client, frontCtor, response).then(front => {
          Trace.sysout("rdp.registerGlobalActor; attach done: " +
            moduleUrl, front);

          // registrarActor object is used for unregistration.
          // The front object is used as the client API.
          deferred.resolve({
            registrar: registrar,
            front: front
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
Rdp.registerTabActor = function(client, options) {
  let deferred = defer();
  let frontCtor = options.frontClass;
  let typeName = frontCtor.prototype.typeName;
  let moduleUrl = options.moduleUrl;

  if (!checkCompatibility()) {
    deferred.resolve({});
    return;
  }

  client.listTabs(response => {
    // Just attach if already registered.
    let tabForm = response.tabs[response.selected];
    if (tabForm[typeName]) {
      Rdp.attachActor(client, frontCtor, tabForm).then(front => {
        deferred.resolve({front: front});
      });
    }

    let config = {
      prefix: options.prefix,
      constructor: options.actorClass,
      type: { tab: true },
    };

    // Make sure to use an existing front object.
    let registry = client.getActor(response["actorRegistryActor"]);
    if (!registry) {
      registry = ActorRegistryFront(client, response);
    }

    // Register the custom actor on the backend.
    registry.registerActor(moduleUrl, config).then(registrar => {
      Trace.sysout("rdp.registerTabActor; registration done: " +
        moduleUrl, registrar);

      client.listTabs(response => {
        let form = response.tabs[response.selected];
        Rdp.attachActor(client, frontCtor, form).then(front => {
          Trace.sysout("rdp.registerTabActor; attach done: " +
            moduleUrl, front);

          // registrarActor object is used for unregistration.
          // actorFront object is used as the client on the client side.
          deferred.resolve({
            registrar: registrar,
            front: front
          });
        });
      });
    });
  });

  return deferred.promise;
}

/**
 * TODO: docs
 *
 * xxxHonza: TODO:
 * 1. caching to avoid too many 'listTabs' packets.
 * 2. using client.getActor to get existing front objects.
 */
Rdp.registerActor = function(client, options) {
  let deferred = defer();

  if (!checkCompatibility()) {
    deferred.resolve({});
    return;
  }

  let tabActor = options.type.tab;
  let globalActor = options.type.global;

  let promises = [];

  // Register as global actor.
  if (options.type.global) {
    promises.push(Rdp.registerGlobalActor(client, options).
      then(({registrar, front}) => {
        return {
          registrar: registrar,
          front: front
        };
    }));
  }

  // Register as tab actor.
  if (options.type.tab) {
    promises.push(Rdp.registerTabActor(client, options).
      then(({registrar, front}) => {
        return {
          registrar: registrar,
          front: front
        };
    }));
  }

  // Wait till both registrations are done.
  all(promises).then(results => {
    if (results.length == 1) {
      deferred.resolve({
        registrar: results[0].registrar,
        front: results[0].front
      });
    } else {
      deferred.resolve({
        global: results[0],
        tab: results[1],
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
  // xxxHonza: use an existing front when possible.
  let front = frontCtor(client, form);
  front.attach().then(() => {
    deferred.resolve(front);
  });

  return deferred.promise;
}

// Helpers

function checkCompatibility() {
  // Dynamic actor installation using ActorRegistryFront doesn't support
  // e10s yet. Also the registry actor has been introduced in Firefox 36
  // Firefox 37 introduces support for e10s (use registerActor method for
  // the feature detection).
  let notSupported = typeof registerActor == "undefined";
  if (System.isMultiprocessEnabled() && notSupported) {
    TraceError.sysout("logging.onToolboxReady; ERROR e10s is not " +
      "supported in this browser version. Try Firefox 37+");
    return false;
  }

  // ActorRegistryFront has been introduced in Firefox 36
  if (typeof ActorRegistryFront == "undefined") {
    TraceError.sysout("logging.onToolboxReady; ERROR dynamic actor " +
      "registration has been introduced in Firefox 36");
    return false;
  }

  return true;
}

// Exports from this module
exports.Rdp = Rdp;

