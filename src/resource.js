(function(angular, undefined){'use strict';

var eResource = angular.module('eResource', []);

eResource.factory('api', [
  '$http', '$q', 'resourceCache', 'resource',
  function($http, $q, cache, resourceFactory){
    var resolveAll = resolveAllArgs.bind(null, $q);

    return {
      get: function(path, config) {
        if (atLeastOneIsPromise(path, config)) {
          return resolveAll(path, config).then(function(resolves){
            return getResource.apply(null, resolves);
          });
        }
        return getResource(path, config);
      },
      post: function(path, data, config) {
        if (atLeastOneIsPromise(path, data, config)) {
          return resolveAll(path, data, config).then(function(resolves) {
            return postResource.apply(null, resolves);
          });
        }
        return postResource(path, config);
      }
    };

    function getResource(path, config) {
      config = angular.extend({}, config);
      config.cache = 'cache' in config ? config.cache : false;
      var resource = cache.retrieve(path);
      if (!resource) {
        resource = cache.store(resourceFactory(path, $http.get(path, config)));
      }
      return resource;
    }
    function postResource(path, data, config) {
      config = angular.extend({}, config);
      var resource = resourceFactory(null, $http.post(path, data, config));
      resource.$promise = resource.$promise.then(cache.store);
      return resource;
    }
  }
]);

eResource.factory('resourceCache', [
  function() {
    var resources = {};
    return {
      store: function(resource) {
        resources[resource.$path] = resource;
        return resource;
      },
      retrieve: function(path) {
        return resources[path];
      }
    };
  }
]);

eResource.factory('resource', function() {
  return function resourceFactory(path, promise) {
    return Object.create(ResourcePrototype, {
      $path: { value: path },
      $promise: { value: promise },
      $proxies: { value: {} }
    });
  };
});

var ResourcePrototype = {
  $proxy: function $proxy(property, fn) {
    this.$proxies[property] = this.hasOwnProperty(property) ? this[property] : property;
    if (this[property] === null || angular.isUndefined(this[property])) return;
    var args = Array.prototype.slice.call(arguments, 2);
    Object.defineProperty(this, property, {
      configurable: true,
      get: function() {
        this[property] = fn.apply(fn, args);
        return this[property];
      },
      set: function(resource) {
        Object.defineProperty(this, property, {
          configurable: true,
          writable: true,
          value: resource
        });
      }
    });
  }
};

function resolveAllArgs(Q) {
  return Q.all(Array.prototype.slice.call(arguments, 1).map(function(arg) {
    return Q.when(arg);
  }));
}
function atLeastOneIsPromise() {
  var atLeastOneIsPromise = false;
  Array.prototype.slice.call(arguments).some(function(arg){
    return atLeastOneIsPromise = isPromise(arg);
  });
  return atLeastOneIsPromise;
};
function isPromise(value) {
  return value && angular.isFunction(value.then);
};

})(angular);
