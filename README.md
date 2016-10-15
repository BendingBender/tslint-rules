[![Build Status][build-image]][build-url] [![Coverage Status][coverage-image]][coverage-url] [![dependencies][deps-image]][deps-url] [![dev-dependencies][dev-deps-image]][dev-deps-url]

# tslint-rules

A set of custom [TSLint](https://github.com/palantir/tslint) rules.

## Available Rules

### `import-barrels`

Enforces usage of barrels (`index.ts`) when importing from a directory that has a barrel file.

#### Rationale:

Allows directories that contain multiple modules to be handled as a single module with a single public interface
and opaque inner structure.
      
This rule works only for ES2015 module syntax `import` statements and checks only **relative** module paths.

#### Usage:
```json
"import-barrels": [
  true,
  {"noExplicitBarrels": false, "fileExtensions": ["ts", "js"]}
]
```

#### Options:

An argument object may be optionally provided, with the following properties:

* `noExplicitBarrels = false`: disallows usage of explicitly named barrels in import statements (`import foo from './foo/index'`)
* `fileExtensions = ['ts', 'js']`: uses the provided file extensions for module and barrel file lookup


### `jasmine-no-lambda-expression-callbacks`

Disallows usage of ES6-style lambda expressions as callbacks to Jasmine BDD functions.  

#### Rationale:


Lambda expressions don't create lexical `this` bindings in order for `this` bindings from outer function scopes to be
visible inside of lambda expressions. This beats Jasmine's own system of managing shared state by passing in a dictionary object
as `this` reference to the user-provided callbacks to take over the memory management from the JavaScript VM to prevent memory
leaks during test runs.

This rule will also check for cases where a call to a function is made with a lambda expression parameter instead of
passing a lambda expression directly as callback to support Angular 2 test style:
```js
beforeEach(async(() => {
  ...
}));

it('something', inject([Service], (service) => {
  ...
}))
```

#### Usage:
```json
"jasmine-no-lambda-expression-callbacks": [true]
```

#### Options:

Not configurable.
  

[build-image]: https://img.shields.io/travis/BendingBender/tslint-rules/master.svg?style=flat-square
[build-url]: https://travis-ci.org/BendingBender/tslint-rules
[coverage-image]: https://img.shields.io/coveralls/BendingBender/tslint-rules/master.svg?style=flat-square
[coverage-url]: https://coveralls.io/r/BendingBender/tslint-rules?branch=master
[deps-image]: https://img.shields.io/david/BendingBender/tslint-rules.svg?style=flat-square
[deps-url]: https://david-dm.org/BendingBender/tslint-rules
[dev-deps-image]: https://img.shields.io/david/dev/BendingBender/tslint-rules.svg?style=flat-square
[dev-deps-url]: https://david-dm.org/BendingBender/tslint-rules?type=dev