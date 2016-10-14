[![Build Status][build-image]][build-url] [![Coverage Status][coverage-image]][coverage-url] [![dependencies][deps-image]][deps-url] [![dev-dependencies][dev-deps-image]][dev-deps-url]

# tslint-rules

A set of custom [TSLint](https://github.com/palantir/tslint) rules.

Available Rules
-----

- `import-barrels-rule`

  Enforce usage of barrels (`index.ts`) when importing from a directory that has a barrel file. This rule
  works only for ES2015 module syntax `import` statements and check only **relative** paths.
  
  Usage:
  ```json
  "import-barrels": [
    true,
    {"noExplicitBarrels": false, "fileExtensions": ["ts", "js"]}
  ]
  ```

  Options:
  
  - `noExplicitBarrels = false`: disallow usage of explicitly named barrels in import statements (`import foo from './foo/index'`)
  - `fileExtensions = ['ts', 'js']`: use the provided file extensions for module file resolution
  

[build-image]: https://img.shields.io/travis/BendingBender/tslint-rules/master.svg?style=flat-square
[build-url]: https://travis-ci.org/BendingBender/tslint-rules
[coverage-image]: https://img.shields.io/coveralls/BendingBender/tslint-rules/master.svg?style=flat-square
[coverage-url]: https://coveralls.io/r/BendingBender/tslint-rules?branch=master
[deps-image]: https://img.shields.io/david/BendingBender/tslint-rules.svg?style=flat-square
[deps-url]: https://david-dm.org/BendingBender/tslint-rules
[dev-deps-image]: https://img.shields.io/david/dev/BendingBender/tslint-rules.svg?style=flat-square
[dev-deps-url]: https://david-dm.org/BendingBender/tslint-rules?type=dev