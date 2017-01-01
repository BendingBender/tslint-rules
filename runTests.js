#!/usr/bin/env node
'use strict';

const argv = require('yargs')
  .usage('Usage: $0 --buildDir [path] --coverage [path]')
  .alias({
    'b': 'buildDir',
    'c': 'coverage'
  })
  .nargs({
    'b': 1,
    'c': 1
  })
  .demand(['b'])
  .argv;

const glob = require('glob');
const path = require('path');
const child_process = require('child_process');

const tslintCommand = path.resolve('./node_modules/.bin/tslint');
const istanbulCommand = path.resolve('./node_modules/.bin/istanbul');
const buildDir = path.resolve(argv.buildDir);
const coverageDir = path.resolve(argv.coverage || '');

glob('src/tests/**/*.ts.lint', (error, files) => {
  if (error) {
    throw error;
  }

  const uniqueDirs = new Set(files.map(path.dirname));

  uniqueDirs.forEach(dir => {
    const pathToBuildDir = path.resolve(dir, buildDir);
    const pathToCoverageDir = path.resolve(dir, coverageDir);

    console.log(`=> running tests from: ${dir}`);
    child_process.execSync(getTestCommand(pathToBuildDir, pathToCoverageDir), {
      cwd: dir,
      stdio: 'inherit'
    });
  });
});

function getTestCommand(buildDir, coverageDir) {
  if (argv.coverage) {
    return `${istanbulCommand} cover --root ${buildDir} --dir ${coverageDir} --report json --print none --include-pid ${tslintCommand} -- --test .`;
  } else {
    return `${tslintCommand} --test .`;
  }
}
