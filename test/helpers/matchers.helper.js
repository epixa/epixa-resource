'use strict';

beforeEach(function() {
  this.addMatchers({
    toBeThenable: function() {
      var actual = this.actual;
      var notText = this.isNot ? "not " : "";
      this.message = function() {
        return "Expected " + actual + " " + notText + "to be thenable (" + notText + "a promise)";
      };
      return isThenable(actual);
    },
    toBeResource: function() {
      var actual = this.actual;
      var notText = this.isNot ? " not" : "";
      this.message = function() {
        return "Expected " + actual + notText + " to be a Resource";
      };
      return angular.isObject(actual)
        && actual.hasOwnProperty('$path')
        && isThenable(actual.$promise)
        && angular.isObject(actual.$proxies);
    },
    toBeObject: function() {
      var actual = this.actual;
      var notText = this.isNot ? " not" : "";
      this.message = function() {
        return "Expected " + actual + notText + " to be an object";
      };
      return angular.isObject(actual);
    },
    toHaveProperty: function(property) {
      var actual = this.actual;
      var notText = this.isNot ? " not" : "";
      this.message = function() {
        return "Expected " + JSON.stringify(actual) + notText + " to have property " + property;
      };
      return property in actual;
    },
    toBeHttpError: function() {
      var actual = this.actual;
      var notText = this.isNot ? " not" : "";
      this.message = function() {
        return "Expected " + JSON.stringify(actual) + notText + " to be an http error";
      };
      return actual.hasOwnProperty('data') && actual.hasOwnProperty('status') && actual.hasOwnProperty('headers');
    }
  });
  function isThenable(obj) {
    return obj && angular.isFunction(obj.then);
  }
});
