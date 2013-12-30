module.exports = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'src/*.js',
      'test/helpers/*.helper.js',
      'test/specs/*.spec.js'
    ],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'src/*.js': ['coverage']
    },
    coverageReporter: {
      reporters: [
        { type: 'lcov' },
        { type: 'text-summary' }
      ]
    },
    port: 8089,
    runnerPort: 9109,
    urlRoot: '/__karma/',
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    autoWatchInterval: 0,
    browsers: ['Firefox'],
    singleRun: true
  });
};
