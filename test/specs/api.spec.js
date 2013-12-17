'use strict';

describe('epixa-resource', function() {
  var $httpBackend, api;

  beforeEach(module('eResource'));
  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
    api = $injector.get('api');

    $httpBackend.whenGET('/foo').respond({ 'foo': 'bar' });
    $httpBackend.whenGET('/404').respond(404);
  }));

  describe('api', function() {
    describe('calling .get()', function() {
      var resource;
      beforeEach(function(){
        resource = api.get('/foo');
      });
      it('should return a resource', function() {
        expect(resource).toBeResource();
      });
      it('should return the exact same resource on subsequent calls for the same path', function() {
        expect(api.get('/foo')).toBe(resource);
      });
      describe('returns a resource that', function() {
        it('should have a string $path set to original http response path', function() {
          expect(resource.$path).toBe('/foo');
        });
        it('should have a thenable $promise', function() {
          expect(resource.$promise).toBeThenable();
        });
        it('should have a function $extend()', function() {
          expect(resource.$extend).toBeFunction();
        });
        it('should have an object $proxies', function() {
          expect(resource.$proxies).toBeObject();
        });
        it('should be populated with response data upon http response', function() {
          expect(resource.foo).toBeUndefined();
          $httpBackend.flush();
          expect(resource.foo).toBe('bar');
        });
        describe('returns a resource with a thenable $promise that', function() {
          var resolve, reject;
          beforeEach(function(){
            resolve = jasmine.createSpy('resolve');
            reject = jasmine.createSpy('reject');
          });
          it('should be resolved with self upon http response', function() {
            resource.$promise.then(resolve);
            expect(resolve).not.toHaveBeenCalled();
            $httpBackend.flush();
            expect(resolve).toHaveBeenCalledWith(resource);
          });
          it('should be rejected upon http response error', function() {
            api.get('/404').$promise.then(resolve, reject);
            expect(reject).not.toHaveBeenCalled();
            $httpBackend.flush();
            expect(resolve).not.toHaveBeenCalled();
            expect(reject).toHaveBeenCalled();
          });
        });
      });
    });
  });
});
