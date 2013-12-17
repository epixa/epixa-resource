(function(angular, undefined){'use strict';

var eResource = angular.module('eResource', []);

eResource.factory('api', [
  '$http', 'resourceCache', 'resourceFactory',
  function($http, cache, resourceFactory){
    return {
      get: function get(path, config) {
        var resource = cache.retrieve(path);
        if (!resource) {
          resource = resourceFactory(path, $http.get(path, config).then(function(response){
            return response.data;
          }));
          cache.store(resource);
        }
        return resource;
      }
    };
  }
]);

eResource.factory('resourceCache', function() {
  var resources = {};
  return {
    store: function store(resource) {
      if (resources[resource.$path] && resource !== resources[resource.$path]) {
        throw Error('Cannot overload resource cache for ' + resource.$path);
      }
      resources[resource.$path] = resource;
      return resource;
    },
    retrieve: function retrieve(path) {
      return resources[path];
    }
  };
});

eResource.factory('resourceFactory', [
  '$q',
  function($q) {
    var ResourcePrototype = {
      $proxyUnless: function $proxyUnless(unlessValue, property, fn) {
        if (this[property] === unlessValue) {
          fn = angular.identity.call(null, unlessValue);
        }
        return this.$proxy.apply(this, Array.prototype.slice.call(arguments, 1));
      },
      $proxy: function $proxy(property, fn) {
        this.$proxies[property] = property in this ? this[property] : property;
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
      },
      $extend: function $extend(data) {
        return extendResource(this, data);
      }
    };

    function extendResource(resource, data) {
      angular.forEach(angular.extend({}, data), function(val, key) {
        if (key[0] === '$') return;
        resource[key] = val;
      });
      return resource;
    }

    return function resourceFactory(path, data) {
      var resource = Object.create(ResourcePrototype);
      if (!isThenable(data)) {
        resource.$extend(data);
      }
      Object.defineProperties(resource, {
        $path: { value: path },
        $promise: { value: $q.when(data).then(function(data) {
          return extendResource(resource, data);
        }) },
        $proxies: { value: {} }
      });
      return resource;
    };
  }]
);

function isThenable(obj) {
  return obj && angular.isFunction(obj.then);
}

})(angular);
