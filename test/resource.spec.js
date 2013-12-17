'use strict';

describe('e-resource', function() {
  var $rootScope, $q, resourceFactory, baseResource, populatedResource;

  beforeEach(module('eResource'));
  beforeEach(inject(function($injector) {
    $rootScope = $injector.get('$rootScope');
    $q = $injector.get('$q');
    resourceFactory = $injector.get('resourceFactory');
    baseResource = resourceFactory();
    populatedResource = resourceFactory('/foo');
    populatedResource.foo = 'bar';
  }));

  describe('resourceFactory', function() {
    it('should be a function', function() {
      expect(resourceFactory).toBeFunction();
    });
    describe('is a function that', function() {
      it('should return a resource', function(){
        expect(resourceFactory()).toBeResource();
      });
      it('should accept a $path string as the first argument that is set on the returned resource', function(){
        expect(resourceFactory('/foo').$path).toBe('/foo');
      });
      describe('when given a data object as the second argument', function() {
        it('should populate the resource immediately', function(){
          var resource = resourceFactory('/foo', { foo: 'bar' });
          expect(resource.foo).toBe('bar');
        });
      });
      describe('when given a promise as the second argument', function() {
        it('should populate the resource with the value that fulfills the promise', function(){
          var deferred = $q.defer();
          var resource = resourceFactory('/foo', deferred.promise);
          expect(resource.foo).toBeUndefined();
          deferred.resolve({foo: 'bar'});
          $rootScope.$apply(); // $q promises only resolve during digest
          expect(resource.foo).toBe('bar');
        });
      });
      describe('returns a resource that', function(){
        it('should expose a $path property', function() {
          expect(baseResource).toHaveProperty('$path');
        });
        it('should expose a thenable $promise', function() {
          expect(baseResource.$promise).toBeThenable();
        });
        it('should expose a function $proxy', function() {
          expect(baseResource.$proxy).toBeFunction();
        });
        it('should expose an object $proxies', function() {
          expect(baseResource.$proxies).toBeObject();
        });
        it('should expose a function $extend', function() {
          expect(baseResource.$extend).toBeFunction();
        });
        describe('has a string $path property that', function() {
          it('cannot be changed', function() {
            expect(function() { return baseResource.$path = 'something'; }).toThrow();
            expect(function() { return delete baseResource.$path; }).toThrow();
          });
        });
        describe('has a thenable $promise that', function() {
          it('should resolve with same resource after that resource is populated', function() {
            var resolvedResource = undefined;
            populatedResource.$promise.then(function(resource) {
              resolvedResource = resource;
            });
            $rootScope.$apply(); // $q promises only resolve during digest
            expect(populatedResource).toBe(resolvedResource);
          });
        });
        describe('has a function $proxy() that', function() {
          it('should replace a property with a proxy to a custom function', function() {
            var proxyFoo = jasmine.createSpy('proxy-foo').andReturn('notbar');
            expect(populatedResource.foo).toBe('bar');
            populatedResource.$proxy('foo', proxyFoo);
            expect(proxyFoo).not.toHaveBeenCalled();
            expect(populatedResource.foo).toBe('notbar');
          });
          it('should proxy all additional arguments to $proxy as arguments to the custom function', function() {
            var proxyFoo = jasmine.createSpy('proxy-foo');
            populatedResource.$proxy('foo', proxyFoo, "one", "two", "three");
            populatedResource.foo;
            expect(proxyFoo).toHaveBeenCalledWith("one", "two", "three");
          });
          it('should index the original value of the proxied property on $proxies', function() {
            populatedResource.$proxy('foo', angular.noop);
            expect(populatedResource.$proxies.foo).toBe('bar');
          });
          it('should index the name of the proxied property as itself on $proxies', function() {
            populatedResource.$proxy('somethingelse', angular.noop);
            expect(populatedResource.$proxies.somethingelse).toBe('somethingelse');
          });
        });
        describe('has a function $proxyUnless() that', function() {
          var fn;
          beforeEach(function() {
            fn = function() { return "bar" };
          });
          it('should call $proxy() with all but first arg if its value does not match that arg', function() {
            spyOn(populatedResource, "$proxy");
            populatedResource.$proxyUnless('notfoo', 'foo', fn, 'one');
            expect(populatedResource.$proxy).toHaveBeenCalledWith('foo', fn, 'one');
          });
          it('should call $proxy() with callback that returns the original value if the first arg matches that value', function() {
            spyOn(populatedResource, "$proxy");
            populatedResource.nullProperty = null;
            populatedResource.$proxyUnless(null, 'nullProperty', fn);
            expect(populatedResource.$proxy).toHaveBeenCalled();
            expect(populatedResource.nullProperty).toBe(null);
          });
        });
        describe('has a function $extend() that', function() {
          it('should populate select properties on the resource object', function() {
            populatedResource.$extend({foo: 'notbar', futureProof: 'allthethings'});
            expect(populatedResource.foo).toBe('notbar');
            expect(populatedResource.futureProof).toBe('allthethings');
          });
          it('should ignore properties prefixed with a $ (dollar sign)', function() {
            populatedResource.$extend({$path: '/notfoo', $futureProof: 'allthethings'});
            expect(populatedResource.$path).toBe('/foo');
            expect(populatedResource).not.toHaveProperty('$futureProof');
          });
          it('should provide a fluent interface (return itself)', function() {
            expect(populatedResource.$extend({})).toBe(populatedResource);
          });
        });
      });
    });
  });
});
