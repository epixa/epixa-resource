'use strict';

describe('epixa-resource', function() {
  beforeEach(module('eResource'));

  describe('resource-cache()', function() {
    var cache, storedByDefault, notStoredByDefault;
    beforeEach(inject(function($injector) {
      cache = $injector.get('resourceCache');
      notStoredByDefault = { $path: '/not-stored-by-default' };
      storedByDefault = { $path: '/stored-by-default' };
      cache.store(storedByDefault);
    }));

    describe('.retrieve()', function() {
      var resource;
      describe('when given a path of a resource that was previously stored', function() {
        beforeEach(function() {
          resource = cache.retrieve('/stored-by-default');
        });
        it('returns that exact resource object', function() {
          expect(resource).toBe(storedByDefault);
        });
      });
      describe('when given a path for a resource that is not stored', function() {
        beforeEach(function() {
          resource = cache.retrieve('/not-stored-by-default');
        });
        it('returns undefined', function() {
          expect(resource).toBeUndefined();
        });
      });
    });
    describe('.store()', function() {
      var returnedResource;
      beforeEach(function() {
        returnedResource = cache.store(notStoredByDefault);
      });
      it('returns the resource it is given (fluent interface)', function() {
        expect(returnedResource).toBe(notStoredByDefault);
      });
      it('is idempotent', function() {
        expect(cache.store.bind(null, notStoredByDefault)).not.toThrow();
      });
      describe('when the first argument is undefined', function() {
        it('throws an error', function() {
          expect(cache.store.bind(null)).toThrow();
        });
      });
      describe('when given a new object with the same .$path as a resource that has already been stored', function() {
        it('throws an error', function() {
          expect(cache.store.bind(null, { $path: '/stored-by-default' })).toThrow();
        });
      });
      describe('when given a resource.$path that is not a string', function() {
        it('throws an error', function() {
          expect(cache.store.bind(null, { $path: null })).toThrow();
          expect(cache.store.bind(null, { $path: undefined })).toThrow();
          expect(cache.store.bind(null, { $path: 1 })).toThrow();
          expect(cache.store.bind(null, { $path: true })).toThrow();
          expect(cache.store.bind(null, { $path: {} })).toThrow();
          expect(cache.store.bind(null, { $path: angular.noop })).toThrow();
        });
      });
    });
    describe('.remove()', function() {
      describe('when the first argument is undefined', function() {
        it('throws an error', function() {
          expect(cache.remove.bind(null)).toThrow();
        });
      });
      describe('when no resource.$path is stored that matches the first argument', function() {
        it('returns undefined', function() {
          expect(cache.remove('/not-stored-by-default')).toBeUndefined();
        });
      });
      describe('when a stored resource.$path matches the first argument', function() {
        var returnedResource;
        beforeEach(function() {
          returnedResource = cache.remove('/stored-by-default');
        });
        it('removes the matching resource', function() {
          expect(cache.retrieve('/stored-by-default')).toBeUndefined();
        });
        it('returns that resource', function() {
          expect(returnedResource).toBe(storedByDefault);
        });
      });
    });
  });
});
