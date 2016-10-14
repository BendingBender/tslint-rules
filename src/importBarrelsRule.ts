import { SourceFile, ImportDeclaration, Expression, SyntaxKind, StringLiteral } from 'typescript';
import * as Lint from 'tslint/lib/lint';
import * as path from 'path';
import * as fs from 'fs';

export class Rule extends Lint.Rules.AbstractRule {
  public static USE_BARREL_FAILURE_STRING = 'Use barrel (index) files for imports if they are available';
  public static NO_EXPLICIT_BARRELS_FAILURE_STRING = "Don't import barrel files by name, import containing directory instead";

  public apply(sourceFile:SourceFile):Lint.RuleFailure[] {
    return this.applyWithWalker(new ImportBarrelsWalker(sourceFile, this.getOptions()));
  }
}

class ImportBarrelsWalker extends Lint.RuleWalker {
  private statCache = new Map();

  public visitImportDeclaration(node:ImportDeclaration) {
    const moduleExpression = node.moduleSpecifier;
    const moduleExpressionError = this.moduleExpressionHasError(moduleExpression);

    if (moduleExpressionError) {
      this.addFailure(this.createFailure(moduleExpression.getStart(), moduleExpression.getWidth(), moduleExpressionError));
    }

    super.visitImportDeclaration(node);
  }

  private getOptionsObject():{fileExtensions?:string[], noExplicitBarrels?:boolean} {
    return this.getOptions()[0] || {};
  }

  private getModuleFileExtensions():string[] {
    let extensions = this.getOptionsObject().fileExtensions || [];

    if (!extensions.length) {
      extensions = ['ts', 'js'];
    }
    return extensions;
  }

  private getExplicitBarrelsAllowed():boolean {
    const {noExplicitBarrels = false} = this.getOptionsObject();

    return !noExplicitBarrels;
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

  private moduleExpressionHasError(expression:Expression):string {
    if (expression.kind !== SyntaxKind.StringLiteral) {
      return null;
    }

    const modulePathText = (<StringLiteral>expression).text;

    // check only relative paths
    if (!modulePathText.startsWith('.')) {
      return null;
    }

    const sourceFileRelative = this.getSourceFile().path;
    const sourceFileDirAbsolute = path.resolve(path.dirname(sourceFileRelative));
    const moduleAbsolute = path.normalize(path.resolve(sourceFileDirAbsolute, modulePathText));
    const moduleDirAbsolute = path.dirname(moduleAbsolute);

    // enforce barrel usage only on files that are not in the same directory or in one of the sub-directories
    // of the module
    if (sourceFileDirAbsolute.startsWith(moduleDirAbsolute)) {
      return null;
    }

    const moduleStats = this.getModuleStats(moduleAbsolute);

    // only file imports are of interest
    if (!moduleStats || moduleStats.isDirectory()) {
      return null;
    }

    // if module's name is 'index', it must be an explicit barrel import, dirs were excluded earlier
    if (path.parse(moduleAbsolute).name === 'index') {
      return this.getExplicitBarrelsAllowed() ? null : Rule.NO_EXPLICIT_BARRELS_FAILURE_STRING;
    }

    return this.getModuleFileExtensions()
      .map(ext => path.join(moduleDirAbsolute, `index.${ext}`))
      .some(file => this.isFile(file)) ? Rule.USE_BARREL_FAILURE_STRING : null;
  }
}
