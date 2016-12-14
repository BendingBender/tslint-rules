import * as fs from 'fs';
import * as path from 'path';
import { IRuleMetadata, RuleFailure, Rules, RuleWalker, Utils } from 'tslint/lib';
import { Expression, ImportDeclaration, SourceFile, StringLiteral, SyntaxKind } from 'typescript';

export class Rule extends Rules.AbstractRule {
  public static metadata:IRuleMetadata = {
    ruleName: 'import-barrels',
    description: Utils.dedent`
      Enforces usage of barrels (\`index.ts\`) when importing from a directory that has a barrel file.`,
    rationale: Utils.dedent`
      Allows directories that contain multiple modules to be handled as a single module with a single public interface
      and opaque inner structure.
      
      This rule works only for ES2015 module syntax \`import\` statements and checks only **relative** module paths.`,
    optionsDescription: Utils.dedent`
      An argument object may be optionally provided, with the following properties:
      
      * \`noExplicitBarrels = false\`: disallows usage of explicitly named barrels in import statements (\`import foo from './foo/index'\`)
      * \`fileExtensions = ['ts', 'js']\`: uses the provided file extensions for module and barrel file lookup`,
    optionExamples: ['[true, {"noExplicitBarrels": false, "fileExtensions": ["ts", "js"]}]'],
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          noExplicitBarrels: {
            type: 'boolean',
          },
          fileExtensions: {
            type: 'array',
            items: {
              type: 'string',
            },
            minLength: 1,
          },
        },
      },
      minLength: 1,
      maxLength: 1,
    },
    type: 'maintainability',
    typescriptOnly: false,
  };

  public static USE_BARREL_FAILURE_STRING = 'Use barrel (index) files for imports if they are available for path: ';
  public static NO_EXPLICIT_BARRELS_FAILURE_STRING = "Don't import barrel files by name, import containing directory instead for path: ";

  public apply(sourceFile:SourceFile):RuleFailure[] {
    return this.applyWithWalker(new ImportBarrelsWalker(sourceFile, this.getOptions()));
  }
}

class ImportBarrelsWalker extends RuleWalker {
  private statCache = new Map<string, fs.Stats>();

  protected visitImportDeclaration(node:ImportDeclaration) {
    const moduleExpression = node.moduleSpecifier;
    const moduleExpressionError = this.getModuleExpressionErrorMessage(moduleExpression);

    if (moduleExpressionError) {
      this.addFailure(this.createFailure(moduleExpression.getStart(), moduleExpression.getWidth(), moduleExpressionError));
    }

    super.visitImportDeclaration(node);
  }

  private getModuleExpressionErrorMessage(expression:Expression):string|null {
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
      return this.getExplicitBarrelsAllowed() ? null : Rule.NO_EXPLICIT_BARRELS_FAILURE_STRING + expression.getText();
    }

    return this.getModuleFileExtensions()
      .map(ext => path.join(moduleDirAbsolute, `index.${ext}`))
      .some(file => this.isFile(file)) ? Rule.USE_BARREL_FAILURE_STRING + expression.getText() : null;
  }

  private getModuleStats(modulePath:string):fs.Stats|null {
    let stats = this.cachedStatSync(modulePath);

    if (!stats) {
      this.getModuleFileExtensions().some(suffix => {
        stats = this.cachedStatSync(`${modulePath}.${suffix}`);
        return stats !== null;
      });
    }

    return stats;
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

  private getOptionsObject():{fileExtensions?:string[], noExplicitBarrels?:boolean} {
    return this.getOptions()[0] || {};
  }

  private isFile(path:string):boolean {
    const stats = this.cachedStatSync(path);
    return stats != null && stats.isFile();
  }

  private cachedStatSync(path:string):fs.Stats|null {
    if (this.statCache.has(path)) {
      return <fs.Stats>this.statCache.get(path);
    }

    const stat = this.statSync(path);
    if (stat !== null) {
      this.statCache.set(path, stat);
    }
    return stat;
  }

  private statSync(path:string):fs.Stats|null {
    try {
      return fs.statSync(path);
    } catch (e) {
      return null;
    }
  }
}
