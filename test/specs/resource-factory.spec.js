'use strict';

describe('epixa-resource', function() {
  beforeEach(module('epixa-resource'));

  var $rootScope, $q;
  beforeEach(inject(function($injector) {
    $rootScope = $injector.get('$rootScope');
    $q = $injector.get('$q');
  }));

  describe('resource-factory()', function() {
    var factory;
    beforeEach(inject(function($injector) {
      factory = $injector.get('resource-factory');
    }));

    describe('returned resource', function() {
      var resource;
      beforeEach(function() {
        resource = factory();
      });

      describe('.$path', function() {
        var setPath = function(val) { resource.$path = val; };
        it('is null by default', function() {
          expect(resource.$path).toBe(null);
        });
        describe('when is null', function() {
          describe('when attempting to set to null', function() {
            beforeEach(setPath.bind(null, null));
            it('has no effect', function() {
              expect(resource.$path).toBe(null);
            });
          });
        });
        describe('when set to a string', function() {
          beforeEach(setPath.bind(null, 'somestring'));
          it('is set to that string value', function() {
            expect(resource.$path).toBe('somestring');
          });
          it('is now immutable', function() {
            expect(setPath.bind(null, null)).toThrow();
            expect(setPath.bind(null, 'someotherstring')).toThrow();
          });
        });
        describe('when attempting to set to something other than a string or null', function() {
          it('throws an error', function() {
            expect(setPath.bind(null, undefined)).toThrow();
            expect(setPath.bind(null, 1)).toThrow();
            expect(setPath.bind(null, true)).toThrow();
            expect(setPath.bind(null, {})).toThrow();
            expect(setPath.bind(null, angular.noop)).toThrow();
          });
        });
      });

      describe('.$promise', function() {
        it('is thenable', function() {
          expect(resource.$promise).toBeThenable();
        });
        it('is fulfilled by the current resource', function() {
          expect(getResolvedValue(resource.$promise)).toBe(resource);
        });
      });

      describe('.$loaded', function() {
        it('is false by default', function() {
          expect(resource.$loaded).toBe(false);
        });
        describe('when .$promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          it('is true', function() {
            expect(resource.$loaded).toBe(true);
          });
        });
      });

      describe('.$proxies', function() {
        it('is an object', function() {
          expect(resource.$proxies).toBeObject();
        });
      });

      describe('.$extend()', function() {
        var returnedValue;
        beforeEach(function() {
          returnedValue = resource.$extend({ $path: '/foo', foo: 'bar' });
        });
        it('extends the resource with properties on the given object', function() {
          expect(resource.foo).toBe('bar');
        });
        it('ignores properties that begin with a $ (dollar sign)', function() {
          expect(resource.$path).toBe(null);
        });
        it('provides a fluent interface (return itself)', function() {
          expect(returnedValue).toBe(resource);
        });
      });

      describe('.$proxy()', function() {
        var proxyFoo;
        beforeEach(function() {
          proxyFoo = jasmine.createSpy('proxy-foo').andReturn('notbar');
          resource.foo = 'bar';
          resource.$proxy('foo', proxyFoo);
          resource.$proxy('somethingelse', angular.noop);
        });
        it('does not call the custom function immediately', function() {
          expect(proxyFoo).not.toHaveBeenCalled();
        });
        it('calls the custom function when property is accessed', function() {
          resource.foo;
          expect(proxyFoo).toHaveBeenCalled();
        });
        it('sets the property to the return value of the proxy function', function() {
          expect(resource.foo).toBe('notbar');
        });
        describe('when called for a property that does not exist', function() {
          it('indexes the new property name as `undefined` on the $proxies object', function() {
            expect(resource.$proxies.somethingelse).toBe(undefined);
          });
        });
        describe('when called for a property that does exist', function() {
          it('indexes the property name as the original value on the $proxies object', function() {
            expect(resource.$proxies.foo).toBe('bar');
          });
        });
      });
    });

    describe('when given a string as the first argument', function() {
      var resource;
      beforeEach(function() {
        resource = factory('/foo');
      });
      describe('returned resource', function() {
        describe('.$path', function() {
          it('is set to given string', function() {
            expect(resource.$path).toBe('/foo');
          });
        });
      });
    });
    describe('when given a function as the first argument', function() {
      var resource;
      beforeEach(function() {
        resource = factory(angular.identity.bind(null, '/foo'));
      });
      describe('returned resource', function() {
        describe('.$path', function() {
          it('is null', function() {
            expect(resource.$path).toBe(null);
          });
        });
        describe('when $promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          describe('.$path', function() {
            it('is set to return value of given function', function() {
              expect(resource.$path).toBe('/foo');
            });
          });
        });
      });
    });
    describe('when given a thenable promise as the first argument', function() {
      var resource;
      beforeEach(function() {
        resource = factory($q.when('/foo'));
      });
      describe('returned resource', function() {
        describe('.$path', function() {
          it('is null', function() {
            expect(resource.$path).toBe(null);
          });
        });
        describe('when $promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          describe('.$path', function() {
            it('is set to the value that fulfills the promise', function() {
              expect(resource.$path).toBe('/foo');
            });
          });
        });
      });
    });
    describe('when given a non-thenable object as the second argument', function() {
      var resource;
      beforeEach(function() {
        resource = factory(null, { foo: 'bar' });
      });
      describe('returned resource', function() {
        it('is populated with properties from given object', function() {
          expect(resource.foo).toBe('bar');
        });
      });
    });
    describe('when given a thenable promise as the second argument', function() {
      var resource;
      beforeEach(function() {
        resource = factory(null, $q.when({foo: 'bar'}));
      });
      describe('returned resource', function() {
        it('is not populated by default', function() {
          expect(resource).not.toHaveProperty('foo');
        });
        describe('when .$promise resolves', function() {
          beforeEach(resolveAll.bind(this));
          it('is populated with properties from the object that fulfills the promise', function() {
            expect(resource.foo).toBe('bar');
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
