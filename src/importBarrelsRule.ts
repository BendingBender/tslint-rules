import { SourceFile, ImportDeclaration, Expression, SyntaxKind, StringLiteral } from 'typescript';
import * as Lint from 'tslint/lib/lint';
import * as path from 'path';
import * as fs from 'fs';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING = 'Use barrel (index) files for imports if they are available';

  public apply(sourceFile:SourceFile):Lint.RuleFailure[] {
    return this.applyWithWalker(new ImportBarrelsWalker(sourceFile, this.getOptions()));
  }
}

class ImportBarrelsWalker extends Lint.RuleWalker {
  private statCache = new Map();

  public visitImportDeclaration(node:ImportDeclaration) {
    const moduleExpression = node.moduleSpecifier;

    if (!this.isModuleExpressionValid(moduleExpression)) {
      this.addFailure(this.createFailure(moduleExpression.getStart(), moduleExpression.getWidth(), Rule.FAILURE_STRING));
    }

    super.visitImportDeclaration(node);
  }

  private getModuleFileExtensions():string[] {
    let extensions = this.getOptions();

    if (!extensions.length) {
      extensions = ['ts', 'js'];
    }
    return extensions;
  }


  private statSync(path:string):fs.Stats {
    try {
      return fs.statSync(path);
    } catch (e) {
      return null;
    }
  }

  private cachedStatSync(path:string):fs.Stats {
    if (this.statCache.has(path)) {
      return this.statCache.get(path);
    }

    const stat = this.statSync(path);
    this.statCache.set(path, stat);
    return stat;
  }

  private getModuleStats(modulePath:string):fs.Stats {
    let stats = this.cachedStatSync(modulePath);

    if (!stats) {
      this.getModuleFileExtensions().some(suffix => {
        stats = this.cachedStatSync(`${modulePath}.${suffix}`);
        return stats !== null;
      });
    }

    return stats;
  }

  private isFile(path:string):boolean {
    const stats = this.cachedStatSync(path);
    return stats != null && stats.isFile();
  }

  private isModuleExpressionValid(expression:Expression):boolean {
    if (expression.kind !== SyntaxKind.StringLiteral) {
      return true;
    }

    const modulePathText = (<StringLiteral>expression).text;

    if (!modulePathText.startsWith('.')) {
      return true;
    }

    const sourceFileRelative = this.getSourceFile().path;
    const sourceFileDirAbsolute = path.resolve(path.dirname(sourceFileRelative));
    const moduleAbsolute = path.normalize(path.resolve(sourceFileDirAbsolute, modulePathText));
    const moduleDirAbsolute = path.dirname(moduleAbsolute);

    // enforce barrel usage only on files that are not in the same directory or in one of the sub-directories
    // of the module
    if (sourceFileDirAbsolute.startsWith(moduleDirAbsolute)) {
      return true;
    }

    const moduleStats = this.getModuleStats(moduleAbsolute);

    // only file imports are of interest
    if (!moduleStats || moduleStats.isDirectory()) {
      return true;
    }

    const moduleFileExtensions = this.getModuleFileExtensions();

    let isExplicitBarrelImport = false;
    if (moduleAbsolute.endsWith('index')) {
      isExplicitBarrelImport = moduleFileExtensions
        .map(ext => `${moduleAbsolute}.${ext}`)
        .some(file => this.isFile(file));
    }

    if (isExplicitBarrelImport) {
      return true;
    }

    return !this.getModuleFileExtensions()
      .map(ext => path.join(moduleDirAbsolute, `index.${ext}`))
      .some(file => this.isFile(file));
  }
}
