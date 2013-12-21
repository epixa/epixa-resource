(function(angular, undefined){'use strict';

var eResource = angular.module('eResource', []);

eResource.factory('resourceApi', [
  '$http', 'resourceCache', 'resourceFactory',
  function($http, cache, resourceFactory){
    function extractData(obj) {
      return obj.data;
    }
    function defaultPathfinder(path, resource) {
      return path.substring(path.lastIndexOf('/')) + '/' + resource.id;
    }
    return {
      get: function get(path, config) {
        var resource = cache.retrieve(path);
        if (!resource) {
          resource = resourceFactory(path, $http.get(path, config).then(extractData));
          cache.store(resource);
        }
        return resource;
      },
      post: function post(path, data, pathfinder, config) {
        angular.isFunction(pathfinder) || (pathfinder = defaultPathfinder);
        pathfinder = pathfinder.bind(null, path);
        var resource = resourceFactory(pathfinder, $http.post(path, data, config).then(extractData));
        resource.$promise = resource.$promise.then(cache.store);
        return resource;
      }
    };
  }
]);

eResource.factory('resourceCache', function() {
  var resources = {};
  return {
    store: function store(resource) {
      if (!angular.isString(resource.$path)) throw new TypeError('Cannot store a resource without a string $path');
      if (resources[resource.$path] && resource !== resources[resource.$path]) {
        throw new Error('Cannot overload resource cache for ' + resource.$path);
      }
      resources[resource.$path] = resource;
      return resource;
    },
    retrieve: function retrieve(path) {
      return resources[path];
    },
    remove: function remove(path) {
      if (!angular.isDefined(path)) throw new TypeError('path must be defined');
      var resource = resources[path];
      delete resources[path];
      return resource;
    }
  };
});

eResource.factory('resourceFactory', [
  '$q',
  function($q) {
    var ResourcePrototype = {
      $proxy: function $proxy(property, fn) {
        this.$proxies[property] = property in this ? this[property] : undefined;
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

    function markAsLoaded(resource) {
      resource.$loaded = true;
      return resource;
    }

    return function resourceFactory(path, data) {
      angular.isDefined(path) || (path = null);
      angular.isDefined(data) || (data = {});

      var resource = Object.create(ResourcePrototype, {
        $proxies: { value: {} }
      });

      if (!isThenable(data)) {
        resource.$extend(data);
      }

      Object.defineProperty(resource, '$path', {
        configurable: true,
        get: function() { return null; },
        set: function(path) {
          if (path === null) return;
          if (!angular.isString(path)) throw new TypeError('Resource.$path must be a string, given ' + typeof path);
          Object.defineProperty(resource, '$path', {
            value: path,
            writable: false,
            enumerable: false,
            configurable: false
          });
        }
      });

      resource.$promise = $q.when(data).then(extendResource.bind(null, resource));

      if (angular.isFunction(path)) {
        resource.$promise = resource.$promise.then(function() {
          resource.$path = path(resource);
          return resource;
        });
      } else if (isThenable(path)) {
        resource.$promise = path.then(function(path) {
          resource.$path = path;
          return resource.$promise;
        });
      } else if (angular.isString(path)) {
        resource.$path = path;
      }

      resource.$promise = resource.$promise.then(markAsLoaded);

      Object.defineProperties(resource, {
        $promise: { value: resource.$promise, writable: true, enumerable: false, configurable: false },
        $loaded: { value: false, writable: true }
      });

      return resource;
    };
  }]
);

function isThenable(obj) {
  return obj && angular.isFunction(obj.then);
}

})(angular);
