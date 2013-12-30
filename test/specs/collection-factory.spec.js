'use strict';

describe('epixa-resource', function() {
  beforeEach(module('epixa-resource'));

  var $rootScope, $q;
  beforeEach(inject(function($injector) {
    $rootScope = $injector.get('$rootScope');
    $q = $injector.get('$q');
  }));

  describe('collection-factory()', function() {
    var factory, mockResource;
    beforeEach(inject(function($injector) {
      factory = $injector.get('collection-factory');
      mockResource = { $path: '/foo/1' };
    }));

    describe('returned collection', function() {
      var collection, pathfinderSpy;
      beforeEach(function() {
        pathfinderSpy = jasmine.createSpy('pathfinder').andCallFake(function(entity) {
          return '/foo/' + entity.foo;
        });
        collection = factory('/foo', [{foo:'bar'}], pathfinderSpy);
      });

      describe('.$path', function() {
        it('is immutable', function() {
          expect(function() { collection.$path = 'test'; }).toThrow();
        });
      });

      describe('.$promise', function() {
        it('is thenable', function() {
          expect(collection.$promise).toBeThenable();
        });
        it('is fulfilled by the current collection', function() {
          expect(getResolvedValue(collection.$promise)).toBe(collection);
        });
      });

      describe('.$loaded', function() {
        it('is false by default', function() {
          expect(collection.$loaded).toBe(false);
        });
        describe('when .$promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          it('is true', function() {
            expect(collection.$loaded).toBe(true);
          });
        });
      });

      describe('.length', function() {
        it('is zero by default', function() {
          expect(collection.length).toBe(0);
        });
        describe('when .$promise resolves', function() {
          it('is equal to the number of resources in the collection', function() {
            expect(collection.length).toBe(collection.resources.length);
          });
        });
      });

      describe('.resources', function() {
        it('is empty array by default', function() {
          expect(collection.resources).toEqual([]);
        });
        describe('when .$promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          it('is populated by resolved resources', function() {
            expect(collection.resources.length).toEqual(1);
          });
        });
      });

      describe('.add()', function() {
        beforeEach(function() {
          resolveAll();
          collection.add(mockResource);
        });
        it('adds the given resource to the collection', function() {
          expect(collection.length).toBe(2);
        });
      });

      describe('.get()', function() {
        beforeEach(function() {
          resolveAll();
          collection.add(mockResource);
        });
        describe('when given a path of a resource that exists in the collection', function() {
          var resource;
          beforeEach(function() {
            resource = collection.get('/foo/1');
          });
          it('returns that resource', function() {
            expect(resource).toBe(mockResource);
          });
        });
        describe('when given a path of a resource not in the collection', function() {
          var resource;
          beforeEach(function() {
            resource = collection.get('/not-in-collection');
          });
          it('returns undefined', function() {
            expect(resource).toBeUndefined();
          });
        });
      });

      describe('.filter()', function() {
        beforeEach(function() {
          resolveAll();
          collection.add(mockResource);
          collection.filter(function(resource) {
            return resource.$path === '/foo/1';
          });
        });
        it('removes any resources that match the given filter function', function() {
          expect(collection.resources.length).toBe(1);
        });
      });

      describe('.remove()', function() {
        beforeEach(function() {
          resolveAll();
          collection.add(mockResource);
          collection.add((function() {
            var newResource = angular.copy(mockResource);
            newResource.$path = '/foo/2';
            return newResource;
          })());
          collection.remove(mockResource);
        });
        it('removes the given resource from the collection', function() {
          expect(collection.resources.length).toBe(2);
        });
        it('preserves index/resource mapping', function() {
          expect(collection.index['/foo/bar']).toBe(0);
          expect(collection.index['/foo/2']).toBe(1);
        });
      });

      describe('when .$promise resolves', function() {
        beforeEach(resolveAll.bind(this));
        describe('resource in collection', function() {
          var resource;
          beforeEach(function() {
            resource = collection.resources[0];
          });
          describe('.$path', function() {
            it('is set to the result of pathfinder', function() {
              expect(resource.$path).toBe('/foo/bar');
            });
          });
        });
      });
    });

    describe('when given an undefined path (first argument)', function() {
      var collection;
      beforeEach(function() {
        collection = factory(undefined, [], angular.noop);
      });
      describe('returned collection', function() {
        describe('.$path', function() {
          it('is null', function() {
            expect(collection.$path).toBe(null);
          });
        })
      });
    });

    describe('when given undefined data (second argument)', function() {
      var collection;
      beforeEach(function() {
        collection = factory(null, undefined);
      });
      describe('returned collection', function() {
        beforeEach(resolveAll.bind(this));
        it('is empty', function() {
          expect(collection.length).toBe(0);
        });
      });
    });

    describe('requires pathfinder (third argument)', function() {
      var collection, entities, pathfinderSpy;
      beforeEach(function() {
        pathfinderSpy = jasmine.createSpy('pathfinder').andReturn('/foo/1');
        entities = [{foo:'bar'},{foo:'notbar'}];
        collection = factory('/foo', entities, pathfinderSpy);
      });
      it('is not called immediately', function() {
        expect(pathfinderSpy).not.toHaveBeenCalled();
      });
      describe('when .$promise resolves', function() {
        beforeEach(resolveAll.bind(this));
        it('is called for each resource in the collection', function() {
          expect(pathfinderSpy.calls.length).toBe(2);
        });
        it('is called with the original entity data for each resource', function(){
          expect(pathfinderSpy).toHaveBeenCalledWith(entities[0]);
          expect(pathfinderSpy).toHaveBeenCalledWith(entities[1]);
        });
      });
    });

    describe('when given an initializer function (fourth argument)', function() {
      var collection, entities, initSpy;
      beforeEach(function() {
        initSpy = jasmine.createSpy('initializer');
        entities = [{foo:'bar'},{foo:'notbar'}];
        collection = factory('/foo', entities, angular.identity.bind(null, '/foo/1'), initSpy);
      });
      describe('initializer function', function() {
        it('is not called immediately', function() {
          expect(initSpy).not.toHaveBeenCalled();
        });
        describe('when .$promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          it('is called for each resource in the collection', function() {
            expect(initSpy.calls.length).toBe(2);
          });
          it('is passed the resource', function(){
            expect(initSpy).toHaveBeenCalledWith(collection.resources[0]);
            expect(initSpy).toHaveBeenCalledWith(collection.resources[1]);
          });
        });
      });
    });
  });

  function resolveAll() {
    $rootScope.$apply(); // resolves angular promises
  };

  function getResolvedValue(promise) {
    var fulfilledBy = undefined;
    var resolved = false;
    promise.then(function(val) {
      resolved = true;
      fulfilledBy = val;
    });
    resolveAll();
    if (!resolved) throw new Error('Promise is not resolved at all');
    return fulfilledBy;
  }
});
