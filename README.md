# epixa-resource
[![Build Status](https://travis-ci.org/epixa/epixa-resource.png)](https://travis-ci.org/epixa/epixa-resource)
[![Coverage Status](https://coveralls.io/repos/epixa/epixa-resource/badge.png?branch=master)](https://coveralls.io/r/epixa/epixa-resource?branch=master)

An angular.js module for mapping http requests to/from defined model objects
and memoizing the results.

## Simple Usage

When the module is initialized as a dependency in your angular app, you can
start using the resource-api service:

```javascript
['resource-api', function(api) {
  // create a resource and asynchronously load its data
  $scope.post = api.get('/posts/1');
  
  // perform actions when the resource data is loaded
  $scope.post.$promise.then(function(post) {
    // post === $scope.post
  });
  
  // query for an entire collection
  $scope.posts = api.collection('/posts');
  
  // again, perform actions when data is loaded
  $scope.posts.$promise.then(function(posts) {
    // posts.resources[0].$path === '/posts/1'
  });
}];
```

## Features beyond that of angular.js $resource

You can accomplish similar behavior to the "Simple Usage" code above with the
main angular-resource module, but we've only scratched the surface:

```javascript
['resource-api', function(api) {
  // set up a resource property to lazy load other resources
  $scope.post = api.get('/posts/1', { initializer: function(post) {
    // post.comments === '/posts/1/comments'
    post.$proxy('comments', api.collection.bind(api, post.comments));
    // no api request is sent right away, but accessing post.comments will
    // immediately convert the value to a new resource for that url and fire
    // off an http request for that data
  }});
  
  $scope.post.$promise.then(function(post) {
    return post.comments.$promise;
  }).then(function(comments) {
    // comments.$path === '/posts/1/comments'
  });

  // asynchronously reload a collection:
  $scope.post.comments.$reload().then(function(comments) {
    // $scope.post.comments === comments
    // note: if you call $reload() while a request is currently out to load
    // data for this resource, it'll return a promise for the original request
    // rather than sending off another http request
  });
}];
```

The proxying behavior is especially convenient in templates:

```html
<h1>{{ post.title }}</h1>
<ul>
  <!-- Unless explicitly accessed previously, post.comments is created right here: -->
  <li ng-repeat="comment in post.comments">
    {{ comment.body }}
  </li>

  <!-- There are some other conveniences available in templates as well. No more flicker while data is loaded: -->
  <li ng-show="post.comments.$loaded && post.comments.length === 0">
    This post has no comments
  </li>
</ul>
```

## The power of memoization

The resource-api service maintains a lookup table of previously accessed
resources and collections, so you can be sure that interacting with a resource
for any given api path is the exact same object no matter where it is accessed.

No more checks to confirm that a resource wasn't already loaded in some other
controller. No more changing a property of a resource in a form submit and then
worrying about updating all other instances of that resource that are bound to
other scopes. No more duplicate api calls unless you explicitly want them.

```javascript
$scope.post = api.get('/posts/1');
// $scope.post === api.get('/posts/1');

api.collection('/posts').then(function(posts) {
  posts.resources.forEach(function(post) {
    if (post.$path === '/posts/1') {
      // post === $scope.post
    }
  });
});

// even works for writes:
api.put('/posts/1', { title:'new title' }).then(function(post) {
  // $scope.post.title === 'new title'
  // $scope.post === post
});
```

## Setting up for development

If you wish to modify or run tests against this module, you'll need to install
all dependencies. You can do this via `npm`:

```
npm install
```

This will first install all of the node modules we rely on for testing and will
then automatically run `bower install` to setup our client-side dependencies.
Other than for troubleshooting, you should not need to call bower directly.

## Running tests

Once all dependencies are installed, you can run the tests via `npm` as well:

```
npm test
```

This will run the unit tests once against Firefox using the local karma module.
If you want to pass custom arguments, you can do so by running the tests via
karma manually.  For example, if you have already installed karma globally, you
can run the following command to start up the karma runner, run the unit tests,
and then automatically re-run the tests whenever the tests or source files
change:

```
karma start test/config.js --singleRun=false
```
