'use strict';

describe('epixa-resource', function() {
  var cache, storedByDefault, notStoredByDefault;

  beforeEach(module('eResource'));
  beforeEach(inject(function($injector) {
    storedByDefault = { $path: '/stored-by-default' };
    notStoredByDefault = { $path: '/not-stored-by-default' };
    cache = $injector.get('resourceCache');
    cache.store(storedByDefault);
  }));

  describe('resourceCache', function() {
    it('should expose a function retrieve()', function() {
      expect(cache.retrieve).toBeFunction();
    });
    it('should expose a function store()', function() {
      expect(cache.store).toBeFunction();
    });
    describe('has a function retrieve() that', function() {
      it('should return a stored resource when given a path', function() {
        expect(cache.retrieve('/stored-by-default')).toBe(storedByDefault);
      });
      it('should return `undefined` when given a non-stored resource path', function() {
        expect(cache.retrieve('/not-stored-by-default')).toBeUndefined();
      });
    });
    describe('has a function store() that', function() {
      it('should return the same resource it is given', function() {
        var returned = cache.store(notStoredByDefault);
        expect(returned).toBe(notStoredByDefault);
      });
      it('should store the resource so its returned on subsequent calls to retrieve()', function() {
        cache.store(notStoredByDefault);
        expect(cache.retrieve('/not-stored-by-default')).toBe(notStoredByDefault);
      });
      it('should have no effect when given an already stored resource', function() {
        expect(cache.store.bind(null, storedByDefault)).not.toThrow();
      });
      it('should throw an error when given an already-stored $path but not exactly the same resource object', function() {
        var liar = { $path: '/stored-by-default' };
        expect(cache.store.bind(null, liar)).toThrow();
      });
    });
  });
});
