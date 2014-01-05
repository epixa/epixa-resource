'use strict';

describe('epixa-resource', function() {
  beforeEach(module('epixa-resource'));

  var $rootScope, $httpBackend, fooData;
  beforeEach(inject(function($injector) {
    $rootScope = $injector.get('$rootScope');
    $httpBackend = $injector.get('$httpBackend');

    fooData = [{id:1,foo:'bar'},{id:2,foo:'notbar'}];
    $httpBackend.whenGET('/foo').respond(200, fooData);

    $httpBackend.whenGET('/foo/1').respond({ id:1, 'foo':'bar' });
    $httpBackend.whenGET('/foo/2').respond({ id:2, 'foo':'notbar' });
    $httpBackend.whenGET('/404').respond(404);

    $httpBackend.whenPOST('/foo').respond(201, {id:2, 'foo':'notbar'});
    $httpBackend.whenPOST('/with/pathfinder').respond(201, {id:1, 'something':'else'});
    $httpBackend.whenPOST('/500').respond(500);

    $httpBackend.whenGET('/already-stored').respond(200, {id:1, 'foo':'notbar'});
    $httpBackend.whenPUT('/already-stored').respond(200, {id:1, 'foo':'bar'});
    $httpBackend.whenGET('/not-yet-stored').respond(200, {id:1, 'foo':'bar'});
    $httpBackend.whenPUT('/not-yet-stored').respond(200, {id:1, 'foo':'bar'});
    $httpBackend.whenPUT('/422').respond(422);

    $httpBackend.whenGET('/thing-to-delete').respond(200);
    $httpBackend.whenDELETE('/thing-to-delete').respond(202);
    $httpBackend.whenDELETE('/422').respond(422);

    $httpBackend.whenGET('/with/path/transformers').respond(200);
    $httpBackend.whenPOST('/with/path/transformers').respond(200, { id: 1 });
    $httpBackend.whenPUT('/with/path/transformers').respond(200);
    $httpBackend.whenDELETE('/with/path/transformers').respond(200);
  }));

  describe('resource-api', function() {
    var api;
    beforeEach(inject(function($injector) {
      api = $injector.get('resource-api');
    }));

    describe('.reload()', function() {
      var resource, collection, collectionConfig;
      beforeEach(function() {
        collectionConfig = {};
        resource = api.get('/foo/1');
        collection = api.query('/foo', collectionConfig);
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      describe('when given a resource that is not yet .$loaded', function() {
        var promise;
        beforeEach(function() {
          promise = api.reload(resource);
          $httpBackend.flush(2);
        });
        it('does not fire off a new GET request for that resource', function() {
          $httpBackend.verifyNoOutstandingRequest();
        });
      });
      describe('when given a collection that is not yet .$loaded', function() {
        var promise;
        beforeEach(function() {
          promise = api.reload(collection);
          $httpBackend.flush(2);
        });
        it('does not fire off a new GET request for that collection', function() {
          $httpBackend.verifyNoOutstandingRequest();
        });
      });
      describe('when given an already loaded resource', function() {
        var promise;
        beforeEach(function() {
          $httpBackend.flush();
          resolveAll();
          promise = api.reload(resource);
        });
        it('fires off a GET request to the given resource.$path', function() {
          $httpBackend.expectGET(resource.$path);
        });
        describe('given resource', function() {
          beforeEach(function() {
            collection.foo = 'notbar';
          });
          describe('when GET request is successful', function() {
            beforeEach(function() {
              $httpBackend.flush(1);
              resolveAll();
            });
            it('is extended by http response body', function() {
              expect(resource.foo).toBe('bar');
            });
          });
        });
        describe('returned promise', function() {
          describe('when resolved', function() {
            beforeEach(function() {
              $httpBackend.flush(1);
            });
            it('is fulfilled with original resource object', function() {
              expect(getResolvedValue(promise)).toBe(resource);
            });
          });
        });
        describe('that is already reloading', function() {
          var alreadyReloading;
          beforeEach(function() {
            alreadyReloading = api.reload(resource);
            $httpBackend.flush(1);
          });
          it('does not fire off a new GET request for the given resource', function() {
            $httpBackend.verifyNoOutstandingRequest();
          });
          describe('returned promise', function() {
            it('is the same object as from the original .reload() call', function() {
              expect(alreadyReloading).toBe(promise);
            });
          });
        });
      });
      describe('when given an already loaded collection', function() {
        var promise;
        beforeEach(function() {
          $httpBackend.flush();
          resolveAll();
          promise = api.reload(collection);
        });
        it('fires off a GET request to the given collection.$path', function() {
          $httpBackend.expectGET(collection.$path);
        });
        describe('given collection', function() {
          beforeEach(function() {
            collection.remove(collection.resources[0]);
            collection.add({$path:'/foo/not-1', foo:'bar'});
            collection.get('/foo/2').foo = 'somethingelse';
          });
          describe('when GET request is successful', function() {
            beforeEach(function() {
              $httpBackend.flush(1);
              resolveAll();
            });
            it('has any new resources from http response', function() {
              var found = collection.resources.some(function(resource) {
                return resource.$path === '/foo/1';
              });
              expect(found).toBe(true);
            });
            it('has no resources that were absent from the response', function() {
              var found = collection.resources.some(function(resource) {
                return resource.$path === '/foo/not-1';
              });
              expect(found).toBe(false);
            });
            describe('resource in collection', function() {
              var resource;
              beforeEach(function() {
                resource = collection.get('/foo/2');
              });
              it('is extended with http response', function() {
                expect(resource.foo).toBe('notbar');
              });
              describe('.$reload()', function() {
                beforeEach(function() {
                  spyOn(api, 'reload').andCallThrough();
                  resource.$reload();
                });
                it('proxies to api.reload()', function() {
                  expect(api.reload).toHaveBeenCalledWith(resource, collectionConfig);
                });
              });
            });
          });
        });
        describe('returned promise', function() {
          describe('when resolved', function() {
            beforeEach(function() {
              $httpBackend.flush(1);
            });
            it('is fulfilled with original collection object', function() {
              expect(getResolvedValue(promise)).toBe(collection);
            });
          });
        });
        describe('that is already reloading', function() {
          var alreadyReloading;
          beforeEach(function() {
            alreadyReloading = api.reload(collection);
            $httpBackend.flush(1);
          });
          it('does not fire off a new GET request for the given collection', function() {
            $httpBackend.verifyNoOutstandingRequest();
          });
          describe('returned promise', function() {
            it('is the same object as from the original .reload() call', function() {
              expect(alreadyReloading).toBe(promise);
            });
          });
        });
        describe('when given an initializer function in the config (second argument)', function() {
          var initSpy;
          beforeEach(function() {
            $httpBackend.flush();
            fooData.push({id:3, foo:'fooo'});
            initSpy = jasmine.createSpy('initializer').andCallFake(function(resource) {
              resource.initialized = true;
            });
            api.reload(collection, { initializer: initSpy });
          });
          describe('initializer function', function() {
            it('is not called immediately', function() {
              expect(initSpy).not.toHaveBeenCalled();
            });
            describe('when promise resolves', function() {
              beforeEach(function() {
                $httpBackend.flush();
              });
              it('is not called on existing resources', function() {
                expect(initSpy).not.toHaveBeenCalledWith(collection.resources[0]);
                expect(initSpy).not.toHaveBeenCalledWith(collection.resources[1]);
              });
              it('is called for new resources', function() {
                expect(initSpy).toHaveBeenCalledWith(collection.resources[2]);
              });
            });
          });
        });
        describe('when given a pathfinder function in the config (second argument)', function() {
          var pathfinderSpy;
          beforeEach(function() {
            $httpBackend.flush();
            pathfinderSpy = jasmine.createSpy('pathfinder').andCallFake(function(collectionPath, entity) {
              return collectionPath + '/' + entity.id;
            });
            api.reload(collection, { pathfinder: pathfinderSpy });
          });
          it('is not called immediately', function() {
            expect(pathfinderSpy).not.toHaveBeenCalled();
          });
          describe('when promise resolves', function() {
            beforeEach(function() {
              $httpBackend.flush();
            });
            it('is called for each resource in the collection', function() {
              expect(pathfinderSpy.calls.length).toBe(2);
            });
            it('is called with the original entity data and collection path for each resource', function(){
              expect(pathfinderSpy).toHaveBeenCalledWith('/foo', {id:1,foo:'bar'});
              expect(pathfinderSpy).toHaveBeenCalledWith('/foo', {id:2,foo:'notbar'});
            });
          });
        });
      });
    });

    describe('.query()', function() {
      var collection, config, storedResource, initSpy, pathfinderSpy, responseTransformer;
      beforeEach(function() {
        responseTransformer = jasmine.createSpy('responseTransformer').andCallFake(function() {
          var data = angular.copy(fooData);
          data.push({id:4,foo:'foooo'});
          return data;
        });
        initSpy = jasmine.createSpy('initializer').andCallFake(function(resource) {
          resource.initialized = true;
        });
        pathfinderSpy = jasmine.createSpy('pathfinder').andCallFake(function(collectionPath, entity) {
          return collectionPath + '/' + entity.id;
        });
        storedResource = api.get('/foo/1'); // make sure it is stored in cache already
        $httpBackend.flush();
        resolveAll();
        config = { initializer: initSpy, pathfinder: pathfinderSpy, transformResponse: [ responseTransformer ] };
        collection = api.query('/foo', config);
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      describe('returned collection', function() {
        describe('.$path', function() {
          it('is equivalent to given path', function() {
            expect(collection.$path).toBe('/foo');
          });
        });
        describe('.$reload()', function() {
          beforeEach(function() {
            spyOn(api, 'reload').andCallThrough();
            collection.$reload();
          });
          it('proxies to api.reload()', function() {
            expect(api.reload).toHaveBeenCalledWith(collection, config);
          });
        });
      });
      describe('when that path has not been seen before', function() {
        it('fires off a GET request to that path', function() {
          $httpBackend.expectGET('/foo');
        });
        describe('returned collection', function() {
          describe('when GET request is successful', function() {
            beforeEach(function() {
              $httpBackend.flush();
            });
            it('is populated with resources from response data', function() {
              expect(collection.resources.length).toBe(3);
            });
            describe('.$promise', function() {
              it('is resolved with collection', function() {
                expect(getResolvedValue(collection.$promise)).toBe(collection);
              });
            });
          });
          describe('when GET request fails', function() {
            beforeEach(function() {
              collection = api.query('/404');
              $httpBackend.flush();
            });
            describe('.$promise', function() {
              it('is rejected with http error', function() {
                expect(getRejectedValue(collection.$promise)).toBeHttpResponse();
              });
            });
          });
        });
        describe('when given an initializer function in the config (second argument)', function() {
          describe('initializer function', function() {
            it('is not called immediately', function() {
              expect(initSpy).not.toHaveBeenCalled();
            });
            describe('when .$promise resolves', function() {
              beforeEach(function() {
                $httpBackend.flush();
              });
              it('is not called on resources that have already been cached', function() {
                expect(initSpy).not.toHaveBeenCalledWith(collection.resources[0]);
              });
              it('is called for uncached resources', function() {
                expect(initSpy).toHaveBeenCalledWith(collection.resources[1]);
              });
            });
          });
        });
        describe('when given a pathfinder function in the config (second argument)', function() {
          it('is not called immediately', function() {
            expect(pathfinderSpy).not.toHaveBeenCalled();
          });
          describe('when .$promise resolves', function() {
            beforeEach(function() {
              $httpBackend.flush();
              resolveAll();
            });
            it('is called for each resource in the collection', function() {
              expect(pathfinderSpy.calls.length).toBe(3);
            });
            it('is called with the original entity data and collection path for each resource', function(){
              expect(pathfinderSpy).toHaveBeenCalledWith('/foo', {id:1,foo:'bar'});
              expect(pathfinderSpy).toHaveBeenCalledWith('/foo', {id:2,foo:'notbar'});
            });
            describe('resource in collection', function() {
              describe('.$path', function() {
                it('is set to the result of the pathfinder', function() {
                  expect(collection.resources[0].$path).toBe('/foo/1');
                  expect(collection.resources[1].$path).toBe('/foo/2');
                });
              });
              describe('when already stored', function() {
                it('is identical to already stored resource (not just the same data)', function() {
                  expect(collection.resources[0]).toBe(storedResource);
                });
              });
              describe('when not already stored', function() {
                it('is stored for future requests', function() {
                  expect(collection.resources[1]).toBe(api.get('/foo/2'));
                });
              });
            });
          });
        });
        describe('when given an array of path transformers in the config (second argument)', function() {
          var collection, firstSpy, secondSpy;
          beforeEach(function() {
            firstSpy = jasmine.createSpy('pathTransformer1').andReturn('/notfoo');
            secondSpy = jasmine.createSpy('pathTransformer2').andReturn('/foo');
            collection = api.query('/transformers', { transformPath: [ firstSpy, secondSpy ] });
          });
          afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
          });
          it('passes the accumulative path to each transformer function', function() {
            expect(firstSpy).toHaveBeenCalledWith('/transformers');
            expect(secondSpy).toHaveBeenCalledWith('/notfoo');
          });
          it('decorates the http path in the array order', function() {
            $httpBackend.expectGET('/foo');
          });
          describe('returned collection', function() {
            describe('.$path', function() {
              it('is the same as original given path', function() {
                expect(collection.$path).toBe('/transformers');
              });
            });
          });
        });
        describe('when given an array of response transformers in the config (second argument)', function() {
          describe('response transformer', function() {
            beforeEach(function() {
              $httpBackend.flush();
            });
            it('is called with response data', function() {
              expect(responseTransformer.mostRecentCall.args[0]).toEqual(fooData);
            });
          });
        });
      });
      describe('when that path has previously been seen', function() {
        var newCollection;
        beforeEach(function() {
          $httpBackend.flush();
          newCollection = api.query('/foo');
          resolveAll();
          collection.remove(collection.resources[0]);
          collection.add({$path:'/foo/not-1', foo:'bar'});
          collection.get('/foo/2').foo = 'somethingelse';
        });
        it('does not fire a GET request to that path', function() {
          $httpBackend.verifyNoOutstandingRequest();
        });
        it('returns the exact same collection object (not just the same data) as was previous seen', function() {
          expect(newCollection).toBe(collection);
        });
      });
    });

    describe('.get()', function() {
      var resource, initSpy, config;
      beforeEach(function() {
        initSpy = jasmine.createSpy('initializer').andCallFake(function(resource) {
          resource.initialized = true;
        });
        config = { initializer: initSpy };
        resource = api.get('/foo/1', config);
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
          describe('.$reload()', function() {
            beforeEach(function() {
              spyOn(api, 'reload').andCallThrough();
              resource.$reload();
            });
            it('proxies to api.reload()', function() {
              expect(api.reload).toHaveBeenCalledWith(resource, config);
            });
          });
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
                expect(getRejectedValue(resource.$promise)).toBeHttpResponse();
              });
            });
          });
        });
        describe('when given an initializer function in the config (second argument)', function() {
          describe('returned resource', function() {
            describe('when .$promise resolves', function() {
              beforeEach(function() {
                $httpBackend.flush();
                resolveAll();
              });
              it('is passed to the initializer function', function() {
                expect(initSpy).toHaveBeenCalledWith(resource);
              });
            });
          });
        });
        describe('when given an array of path transformers in the config (second argument)', function() {
          var resource, pathSpy, transformersSpy;
          beforeEach(function() {
            pathSpy = jasmine.createSpy('path').andReturn('/path/transformers');
            transformersSpy = jasmine.createSpy('transformers').andReturn('/with/path/transformers');
            resource = api.get('/transformers', { transformPath: [ pathSpy, transformersSpy ] });
          });
          afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
          });
          it('passes the accumulative path to each transformer function', function() {
            expect(pathSpy).toHaveBeenCalledWith('/transformers');
            expect(transformersSpy).toHaveBeenCalledWith('/path/transformers');
          });
          it('decorates the http path in the array order', function() {
            $httpBackend.expectGET('/with/path/transformers');
          });
          describe('returned resource', function() {
            describe('.$path', function() {
              describe('when http request completes', function() {
                beforeEach(function() {
                  $httpBackend.flush();
                  resolveAll();
                });
                it('is not affected', function() {
                  expect(resource.$path).toBe('/transformers');
                });
              });
            });
          });
        });
      });
      describe('when default path transformers are configured', function() {
        var pathSpy, resource;
        beforeEach(function() {
          pathSpy = jasmine.createSpy('path').andReturn('/with/path/transformers');
          api.defaults.transformPath.push(pathSpy);
          resource = api.get('/transformers');
        });
        describe('default path transformers', function() {
          describe('when multiple http requests are attempted', function() {
            beforeEach(function() {
              $httpBackend.flush();
              api.reload(resource);
            });
            it('are only invoked once per request', function() {
              expect(pathSpy.calls.length).toBe(2);
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
      var resource, initSpy, config, requestTransformer;
      beforeEach(function() {
        requestTransformer = jasmine.createSpy('requestTransformer').andCallFake(function(data) {
          data = angular.copy(data);
          data.transformed = true;
          return data;
        });
        initSpy = jasmine.createSpy('initializer').andCallFake(function(resource) {
          resource.initialized = true;
        });
        config = { initializer: initSpy, transformRequest: [requestTransformer] };
        resource = api.post('/foo', { foo: 'notbar' }, config);
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      it('sends data object in POST request to the given path', function() {
        $httpBackend.expectPOST('/foo', { foo: 'notbar', transformed: true });
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
        describe('.$reload()', function() {
          beforeEach(function() {
            spyOn(api, 'reload').andCallThrough();
            resource.$reload();
          });
          it('proxies to api.reload()', function() {
            expect(api.reload).toHaveBeenCalledWith(resource, config);
          });
        });
        describe('when POST request fails', function() {
          beforeEach(function() {
            resource = api.post('/500');
            $httpBackend.flush();
          });
          describe('.$promise', function() {
            it('is rejected with http error', function() {
              expect(getRejectedValue(resource.$promise)).toBeHttpResponse();
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
      describe('when given an initializer function in the config (third argument)', function() {
        describe('returned resource', function() {
          describe('when .$promise resolves', function() {
            beforeEach(function() {
              $httpBackend.flush();
              resolveAll();
            });
            it('is passed to the initializer function', function() {
              expect(initSpy).toHaveBeenCalledWith(resource);
            });
          });
        });
      });
      describe('when given a custom pathfinder in the config (third argument)', function() {
        var pathfinder;
        beforeEach(function() {
          pathfinder = jasmine.createSpy('pathfinder').andReturn('/custom/pathfinder');
          resource = api.post('/with/pathfinder', { foo: 'notbar' }, {pathfinder: pathfinder});
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
      describe('when given an array of path transformers in the config (third argument)', function() {
        var resource, pathSpy, transformersSpy;
        beforeEach(function() {
          pathSpy = jasmine.createSpy('path').andReturn('/path/transformers');
          transformersSpy = jasmine.createSpy('transformers').andReturn('/with/path/transformers');
          resource = api.post('/transformers', {}, { transformPath: [ pathSpy, transformersSpy ] });
        });
        afterEach(function() {
          $httpBackend.verifyNoOutstandingExpectation();
        });
        it('passes the accumulative path to each transformer function', function() {
          expect(pathSpy).toHaveBeenCalledWith('/transformers');
          expect(transformersSpy).toHaveBeenCalledWith('/path/transformers');
        });
        it('decorates the http path in the array order', function() {
          $httpBackend.expectPOST('/with/path/transformers');
        });
        describe('returned resource', function() {
          describe('.$path', function() {
            describe('when http request completes', function() {
              beforeEach(function() {
                $httpBackend.flush();
                resolveAll();
              });
              it('is not affected', function() {
                expect(resource.$path).toBe('/transformers/1');
              });
            });
          });
        });
      });
      describe('when given an array of request transformers in the config (third argument)', function() {
        describe('request transformer', function() {
          beforeEach(function() {
            $httpBackend.flush();
          });
          it('is called with request data', function() {
            expect(requestTransformer.mostRecentCall.args[0]).toEqual({ foo : 'notbar'});
          });
        });
      });
    });

    describe('.put()', function() {
      beforeEach(function() {
        api.put('/already-stored', {foo: 'notbar'});
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      it('sends PUT request to the given path', function() {
        $httpBackend.expectPUT('/already-stored', {foo: 'notbar'});
      });
      describe('returned promise', function() {
        describe('when PUT request fails', function() {
          var promise;
          beforeEach(function() {
            promise = api.put('/422');
            $httpBackend.flush();
          });
          it('is rejected with http error', function() {
            expect(getRejectedValue(promise)).toBeHttpResponse();
          });
        });
      });
      describe('when given a path that already has been stored', function() {
        var resource, promise;
        beforeEach(function() {
          resource = api.get('/already-stored');
          $httpBackend.flush(); // ensure it is stored
          promise = api.put('/already-stored', {foo: 'bar'});
          $httpBackend.flush();
        });
        describe('returned promise', function() {
          it('is fulfilled by the stored resource', function() {
            expect(getResolvedValue(promise)).toBe(resource);
          });
        });
        describe('stored resource', function() {
          it('is updated with http response', function() {
            expect(resource.foo).toBe('bar');
          });
        });
      });
      describe('when given a path that has not been stored', function() {
        var promise, initSpy, config;
        beforeEach(function() {
          initSpy = jasmine.createSpy('initializer').andCallFake(function(resource) {
            resource.initialized = true;
          });
          config = {initializer: initSpy};
          promise = api.put('/not-yet-stored', {foo: 'bar'}, config);
          $httpBackend.flush();
        });
        describe('returned promise', function() {
          it('is fulfilled with resource', function() {
            expect(getResolvedValue(promise)).toBeResource();
          });
          describe('resolved resource', function() {
            var resource;
            beforeEach(function() {
              resource = getResolvedValue(promise);
              api.get('/not-yet-stored');
              resolveAll();
            });
            it('is stored for future reuqests for the same $path', function() {
              $httpBackend.verifyNoOutstandingRequest();
            });
            describe('.$path', function() {
              it('is set to given path', function() {
                expect(resource.$path).toBe('/not-yet-stored');
              });
              it('is populated with http response body', function() {
                expect(resource.id).toBe(1);
              });
            });
            describe('.$reload()', function() {
              beforeEach(function() {
                spyOn(api, 'reload').andCallThrough();
                resource.$reload();
              });
              it('proxies to api.reload()', function() {
                expect(api.reload).toHaveBeenCalledWith(resource, config);
              });
            });
          });
        });
      });
      describe('when given an initializer function in the config (third argument)', function() {
        var promise, initSpy;
        beforeEach(function() {
          initSpy = jasmine.createSpy('initializer').andCallFake(function(resource) {
            resource.initialized = true;
          });
          promise = api.put('/not-yet-stored', {foo: 'bar'}, {initializer: initSpy});
          $httpBackend.flush();
        });
        describe('returned promise', function() {
          describe('resolved resource', function() {
            var resource;
            beforeEach(function() {
              resource = getResolvedValue(promise);
            });
            it('is passed to the initializer function', function() {
              expect(initSpy).toHaveBeenCalledWith(resource);
            });
          });
        });
      });
      describe('when given an array of path transformers in the config (third argument)', function() {
        var promise, pathSpy, transformersSpy;
        beforeEach(function() {
          pathSpy = jasmine.createSpy('path').andReturn('/path/transformers');
          transformersSpy = jasmine.createSpy('transformers').andReturn('/with/path/transformers');
          promise = api.put('/transformers', {}, { transformPath: [ pathSpy, transformersSpy ] });
        });
        afterEach(function() {
          $httpBackend.verifyNoOutstandingExpectation();
        });
        it('passes the accumulative path to each transformer function', function() {
          expect(pathSpy).toHaveBeenCalledWith('/transformers');
          expect(transformersSpy).toHaveBeenCalledWith('/path/transformers');
        });
        it('decorates the http path in the array order', function() {
          $httpBackend.expectPUT('/with/path/transformers');
        });
        describe('returned promise', function() {
          describe('resolved resource', function() {
            var resource;
            beforeEach(function() {
              $httpBackend.flush();
              resource = getResolvedValue(promise);
            });
            describe('.$path', function() {
              it('is not affected', function() {
                expect(resource.$path).toBe('/transformers');
              });
            });
          });
        });
      });
    });

    describe('.delete()', function() {
      beforeEach(function() {
        api.delete('/thing-to-delete');
      });
      afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
      });
      it('sends DELETE request to the given path', function() {
        $httpBackend.expectDELETE('/thing-to-delete');
      });
      describe('returned promise', function() {
        describe('when DELETE request fails', function() {
          var promise;
          beforeEach(function() {
            promise = api.delete('/422');
            $httpBackend.flush();
          });
          it('is rejected with http error', function() {
            expect(getRejectedValue(promise)).toBeHttpResponse();
          });
        });
        describe('when DELETE request is successful', function() {
          var promise;
          beforeEach(function() {
            promise = api.delete('/thing-to-delete');
            $httpBackend.flush();
          });
          it('is resolved with http response', function() {
            expect(getResolvedValue(promise)).toBeHttpResponse();
          });
        });
      });
      describe('when path matches the .$path of a stored resource', function() {
        var promise;
        beforeEach(function() {
          api.get('/thing-to-delete'); // ensure the thing is stored before delete
          promise = api.delete('/thing-to-delete');
          $httpBackend.flush();
        });
        describe('stored resource', function() {
          describe('when returned promise resolves', function() {
            beforeEach(function() {
              api.get('/thing-to-delete');
            });
            afterEach(function() {
              $httpBackend.verifyNoOutstandingExpectation();
            });
            it('is removed from cache so future requests to that resource do fire an http request', function() {
              $httpBackend.expectGET('/thing-to-delete');
            });
          });
        });
      });
      describe('when given an array of path transformers in the config (second argument)', function() {
        var pathSpy, transformersSpy;
        beforeEach(function() {
          pathSpy = jasmine.createSpy('path').andReturn('/path/transformers');
          transformersSpy = jasmine.createSpy('transformers').andReturn('/with/path/transformers');
          api.delete('/transformers', { transformPath: [ pathSpy, transformersSpy ] });
        });
        afterEach(function() {
          $httpBackend.verifyNoOutstandingExpectation();
        });
        it('passes the accumulative path to each transformer function', function() {
          expect(pathSpy).toHaveBeenCalledWith('/transformers');
          expect(transformersSpy).toHaveBeenCalledWith('/path/transformers');
        });
        it('decorates the http path in the array order', function() {
          $httpBackend.expectDELETE('/with/path/transformers');
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
