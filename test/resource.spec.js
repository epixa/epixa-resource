'use strict';

describe('e-resource', function() {
  var $httpBackend, api;

  beforeEach(module('eResource'));
  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
    api = $injector.get('api');

    // todo: define $httpBackend.expects
    $httpBackend.whenGET('/foo').respond({ 'foo': 'bar' });
  }));

  beforeEach(function() {
    this.addMatchers({
      toBePromise: function() {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";
        this.message = function() {
          return "Expected " + actual + notText + " to be a promise";
        };
        return isPromise(actual);
      },
      toBeResource: function() {
        var actual = this.actual;
        var notText = this.isNot ? " not" : "";
        this.message = function() {
          return "Expected " + actual + notText + " to be a Resource";
        };
        return isResource(actual);
      }
    });
    var isFunction = angular.isFunction;
    var isObject = angular.isObject;
    var isString = angular.isString;
    function isResource(obj) {
      return isObject(obj)
          && obj.hasOwnProperty('$path')
          && isPromise(obj.$promise)
          && isObject(obj.$proxies);
    }
    function isPromise(obj) {
      return isFunction(obj.then);
    };
  });

  describe('api', function() {
    describe('calling .get()', function() {
      describe('with no arguments that are promises', function() {
        it('should return a resource', function() {
          expect(api.get('/foo')).toBeResource();
          expect(api.get('/foo', {})).toBeResource();
        });
        describe('returns a resource that', function() {
          //testResource(api.get('/foo'));
        });
      });

      describe('with at least one argument that is a promise', function() {
        var path = { then: function(success) { return success('/foo'); } };
        var config = { then: function(success) { return success({}); } };

        it('should return a promise', function() {
          expect(api.get(path)).toBePromise();
          expect(api.get(path, config)).toBePromise();
          expect(api.get('/foo', config)).toBePromise();
          expect(api.get(path, {})).toBePromise();
        });

        describe('returns a promise that', function() {
          it('should resolve with the resource', function() {
            var resolvedResource = undefined;
            var eventuallyResolve = false;
            api.get(path, config).then(function(resource){
              eventuallyResolve = true;
              resolvedResource = resource;
            });
            expect(eventuallyResolve).not.toBe(true);
            expect(resolvedResource).not.toBeResource();
            $httpBackend.flush();
            expect(eventuallyResolve).toBe(true);
            expect(resolvedResource).toBeResource();
          });

          describe('resolves', function() {
            //testResource(resolvedResource);
          });
        });
      });
    });
  });

  function testResource(resource) {
    it('should be tested', function() {
      expect(true).not.toBe(true);
    });
  };
});
