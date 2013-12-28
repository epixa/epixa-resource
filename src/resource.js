(function(angular, undefined){'use strict';

var eResource = angular.module('epixa-resource', []);

eResource.factory('resource-api', [
  '$http', 'resource-cache', 'resource-factory',
  function($http, cache, resourceFactory){
    var defaults = {
      cache: false,
      transformPath: [],
      transformRequest: angular.copy($http.defaults.transformRequest),
      transformResponse: angular.copy($http.defaults.transformResponse),
      pathfinder: function defaultPathfinder(path, resource) {
        return path.substring(path.lastIndexOf('/')) + '/' + resource.id;
      }
    };
    var emptyConfig = {
      transformPath: [],
      transformRequest: [],
      transformResponse: []
    };
    function extractData(obj) {
      return obj.data;
    }
    function initConfig(config) {
      config = angular.extend({}, emptyConfig, config);
      config.transformPath.push.apply(config.transformPath, angular.copy(defaults.transformPath));
      config.transformRequest.push.apply(config.transformRequest, angular.copy(defaults.transformRequest));
      config.transformResponse.unshift.apply(config.transformResponse, angular.copy(defaults.transformResponse));
      return config;
    }
    function httpPath(transformers, path) {
      return transformers.reduce(function(path, fn) {
        return fn(path);
      }, path);
    }
    return {
      defaults: defaults,
      get: function getResource(path, config) {
        var resource = cache.retrieve(path);
        if (!resource) {
          config = initConfig(config);
          var promise = $http.get(httpPath(config.transformPath, path), config).then(extractData);
          resource = resourceFactory(path, promise, config.initializer);
          cache.store(resource);
        }
        return resource;
      },
      post: function postResource(path, data, config) {
        config = initConfig(config);
        var pathfinder = (config.pathfinder ? config.pathfinder : defaults.pathfinder).bind(null, path);
        var promise = $http.post(httpPath(config.transformPath, path), data, config).then(extractData);
        var resource = resourceFactory(pathfinder, promise, config.initializer);
        resource.$promise = resource.$promise.then(cache.store);
        return resource;
      },
      put: function putResource(path, data, config) {
        config = initConfig(config);
        var promise = $http.put(httpPath(config.transformPath, path), data, config).then(extractData);
        return resourceFactory(path, promise, config.initializer).$promise.then(function(resource) {
          var storedResource = cache.retrieve(resource.$path);
          if (storedResource) {
            return promise.then(function(data) {
              return storedResource.$extend(data);
            });
          }
          resource.$promise = resource.$promise.then(cache.store);
          return resource;
        });
      },
      delete: function deleteResource(path, config) {
        config = initConfig(config);
        return $http.delete(httpPath(config.transformPath, path), config).then(function(response) {
          cache.remove(path);
          return response;
        });
      }
    };
  }
]);

eResource.factory('resource-cache', function() {
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

eResource.factory('resource-factory', [
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

    function initialize(init, resource) {
      init(resource);
      return resource;
    }

    return function resourceFactory(path, data, init) {
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

      if (angular.isFunction(init)) {
        resource.$promise = resource.$promise.then(initialize.bind(null, init));
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
