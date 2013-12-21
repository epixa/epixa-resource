'use strict';

describe('epixa-resource', function() {
  beforeEach(module('eResource'));

  var $rootScope, $httpBackend;
  beforeEach(inject(function($injector) {
    $rootScope = $injector.get('$rootScope');
    $httpBackend = $injector.get('$httpBackend');

    var maxFooId = 2;
    $httpBackend.whenGET('/foo/1').respond({ id:1, 'foo':'bar' });
    $httpBackend.whenGET('/404').respond(404);
    $httpBackend.whenPOST('/foo').respond(201, {id:2, 'foo':'notbar'});
    $httpBackend.whenPOST('/with/pathfinder').respond(201, {id:1, 'something':'else'});
    $httpBackend.whenPOST('/500').respond(500);
  }));

  describe('resource-api', function() {
    var api;
    beforeEach(inject(function($injector) {
      api = $injector.get('resourceApi');
    }));

    describe('.get()', function() {
      var resource;
      beforeEach(function() {
        resource = api.get('/foo/1');
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      describe('returned resource', function() {
        describe('.$path', function() {
          it('is equivalent to given path', function() {
            expect(resource.$path).toBe('/foo/1');
          });
        });
      });
      describe('when that path has not been seen before', function() {
        it('fires off a GET request to that path', function() {
          $httpBackend.expectGET('/foo/1');
        });
        describe('returned resource', function() {
          describe('when GET request is successful', function() {
            beforeEach(function() {
              $httpBackend.flush();
            });
            it('is extended with properties from response data', function() {
              expect(resource.foo).toBe('bar');
            });
            describe('.$promise', function() {
              it('is resolved with resource', function() {
                expect(getResolvedValue(resource.$promise)).toBe(resource);
              });
            });
          });
          describe('when GET request fails', function() {
            beforeEach(function() {
              resource = api.get('/404');
              $httpBackend.flush();
            });
            describe('.$promise', function() {
              it('is rejected with http error', function() {
                expect(getRejectedValue(resource.$promise)).toBeHttpError();
              });
            });
          });
        });
      });
      describe('when that path has previously been seen', function() {
        var newResource;
        beforeEach(function() {
          $httpBackend.flush();
          newResource = api.get('/foo/1');
          resolveAll();
        });
        it('does not fire a GET request to that path', function() {
          $httpBackend.verifyNoOutstandingRequest();
        });
        it('returns the exact same resource object (not just the same data) as was previous seen', function() {
          expect(newResource).toBe(resource);
        });
      });
    });

    describe('.post()', function() {
      var resource;
      beforeEach(function() {
        resource = api.post('/foo', { foo: 'notbar' });
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      it('sends data object in POST request to the given path', function() {
        $httpBackend.expectPOST('/foo', { foo: 'notbar' });
      });
      describe('returned resource', function() {
        describe('.$path', function() {
          it('is null', function() {
            expect(resource.$path).toBe(null);
          });
          describe('when .$promise resolves', function() {
            beforeEach(function() {
              $httpBackend.flush();
              resolveAll();
            });
            it('is set to <given-path>/<resource.id>', function() {
              expect(resource.$path).toBe('/foo/2');
            });
          });
        });
        describe('when POST request fails', function() {
          beforeEach(function() {
            resource = api.post('/500');
            $httpBackend.flush();
          });
          describe('.$promise', function() {
            it('is rejected with http error', function() {
              expect(getRejectedValue(resource.$promise)).toBeHttpError();
            });
          });
        });
        describe('when POST request is successful', function() {
          beforeEach(function() {
            $httpBackend.flush();
            resolveAll();
          });
          it('is extended by POST request response body', function() {
            expect(resource.foo).toBe('notbar');
          });
          describe('.$promise', function() {
            it('is resolved with the resource', function() {
              expect(getResolvedValue(resource.$promise)).toBe(resource);
            });
          });
        });
        describe('when .$promise resolves', function() {
          beforeEach(function() {
            $httpBackend.flush();
            api.get('/foo/2');
            resolveAll();
          });
          it('is stored so subsequent calls to .get() for that resource do not fire a new request', function() {
            $httpBackend.verifyNoOutstandingRequest();
          });
        });
      });
      describe('when given a custom pathfinder function as the third argument', function() {
        var pathfinder;
        beforeEach(function() {
          pathfinder = jasmine.createSpy('pathfinder').andReturn('/custom/pathfinder');
          resource = api.post('/with/pathfinder', { foo: 'notbar' }, pathfinder);
        });
        describe('returned resource', function() {
          describe('.$path', function() {
            it('is null', function() {
              expect(resource.$path).toBe(null);
            });
            describe('when .$promise resolves', function() {
              beforeEach(function() {
                $httpBackend.flush();
                resolveAll();
              });
              it('is set to returned value from custom pathfinder', function() {
                expect(resource.$path).toBe('/custom/pathfinder');
              });
              describe('custom pathfinder', function() {
                it('is called with given path and returned resource', function() {
                  expect(pathfinder).toHaveBeenCalledWith('/with/pathfinder', resource);
                });
              });
            });
          });
        });
      });
    });

    describe('.put()', function() {
      describe('returned promise', function() {
        describe('when PUT request fails', function() {
          it('is rejected with http error');
        });
      });
      describe('when given a path as the first argument', function() {
        it('sends PUT request to that path');
        describe('returned promise', function() {
          describe('when PUT request is successful', function() {
            it('is resolved with resource');
            describe('resolved resource', function() {
              it('is stored for subsequent calls to .get() for that resource');
              describe('.$path', function() {
                it('is set to given path');
                it('is populated with http response body');
              });
            });
          });
        });
      });
      describe('when given a resource as the first argument', function() {
        it('sends normalized resource data in PUT request to resource.$path');
        describe('returned promise', function() {
          describe('when PUT request is successful', function() {
            it('is resolved with the given resource');
            describe('given resource', function() {
              it('is extended with properties from PUT response body');
              it('is stored for subsequent calls to .get() for that resource');
            });
          });
        });
      });
    });

    describe('.delete()', function() {
      it('sends DELETE request to the given path');
      describe('returned promise', function() {
        describe('when DELETE request fails', function() {
          it('is rejected with http error');
        });
        describe('when DELETE request is successful', function() {
          it('is resolved with http response');
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
  function getRejectedValue(promise) {
    var rejectedBy = undefined;
    var rejected = false;
    promise.then(null, function(val) {
      rejected = true;
      rejectedBy = val;
    });
    resolveAll();
    if (!rejected) throw new Error('Promise is not rejected at all');
    return rejectedBy;
  }
});
