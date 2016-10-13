import * as glob from 'glob';
import * as path from 'path';
import { execSync } from 'child_process';

const tslintCommand = path.resolve('./node_modules/.bin/tslint');

glob('src/tests/**/*.ts.lint', (error, files) => {
  if (error) {
    throw error;
  }

  files
    .map(file => path.dirname(file))
    .forEach(dir => {
      execSync(`${tslintCommand} --test .`, {
        cwd: dir,
        stdio: 'inherit'
      });
    });
});
