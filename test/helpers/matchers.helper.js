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
    toBeFunction: function() {
      var actual = this.actual;
      var notText = this.isNot ? " not" : "";
      this.message = function() {
        return "Expected " + actual + notText + " to be a function";
      };
      return angular.isFunction(actual);
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
        return "Expected " + actual + notText + " to have property " + property;
      };
      return property in actual;
    }
  });
  function isThenable(obj) {
    return obj && angular.isFunction(obj.then);
  }
});
