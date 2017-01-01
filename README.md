[![Build Status][build-image]][build-url] [![Coverage Status][coverage-image]][coverage-url] [![dependencies][deps-image]][deps-url] [![dev-dependencies][dev-deps-image]][dev-deps-url]

[![NPM][npm-image]][npm-url]

# tslint-rules

A set of custom [TSLint](https://github.com/palantir/tslint) rules.


# Usage

Install from npm to your devDependencies:
```
npm install --save-dev custom-tslint-rules
```

Configure tslint to use the custom-tslint-rules folder:

Add the following path to the `rulesDirectory` setting in your `tslint.json` file:

```json
{
   "rulesDirectory": [
     "node_modules/custom-tslint-rules/dist"
   ],
   "rules": {
     ...
   }
}
```

Now configure some of the new rules.


# Available Rules

## `import-barrels`

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
* `fixWithExplicitBarrelImport`: uses the provided string to replace non-barrel imports in `--fix` mode
  (i.e. when set to `'index'`, `import foo from './foo/some-module'` becomes `import foo from './foo/index'`)


## `jasmine-no-lambda-expression-callbacks`

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
"jasmine-no-lambda-expression-callbacks": true
```

#### Options:

Not configurable.

# Contributions and Development

Issue reports and pull requests are highly welcome! Please make sure to provide sensible tests along with your pull request.

To get started with development, clone the project and run `npm install`.
To run the tests execute `npm test`. `npm run cover` will run the tests along with generating a coverage report.


[build-image]: https://img.shields.io/travis/BendingBender/tslint-rules/master.svg?style=flat-square
[build-url]: https://travis-ci.org/BendingBender/tslint-rules
[coverage-image]: https://img.shields.io/coveralls/BendingBender/tslint-rules/master.svg?style=flat-square
[coverage-url]: https://coveralls.io/r/BendingBender/tslint-rules?branch=master
[deps-image]: https://img.shields.io/david/BendingBender/tslint-rules.svg?style=flat-square
[deps-url]: https://david-dm.org/BendingBender/tslint-rules
[dev-deps-image]: https://img.shields.io/david/dev/BendingBender/tslint-rules.svg?style=flat-square
[dev-deps-url]: https://david-dm.org/BendingBender/tslint-rules?type=dev
[npm-image]: https://nodei.co/npm/custom-tslint-rules.png?downloads=true
[npm-url]: https://npmjs.org/package/custom-tslint-rules