import * as fs from 'fs';
import * as path from 'path';
import { Fix, IOptions, IRuleMetadata, Replacement, RuleFailure, Rules, RuleWalker, Utils } from 'tslint/lib';
import { Expression, ImportDeclaration, SourceFile, StringLiteral, SyntaxKind } from 'typescript';
import { CachedStat } from './utils/cachedStat';

export class Rule extends Rules.AbstractRule {
  public static readonly metadata:IRuleMetadata = {
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
      * \`fileExtensions = ['ts', 'js']\`: uses the provided file extensions for module and barrel file lookup
      * \`fixWithExplicitBarrelImport\`: uses the provided string to replace non-barrel imports in \`--fix\` mode
        (i.e. when set to \`'index'\`, \`import foo from './foo/some-module'\` becomes \`import foo from './foo/index'\`)`,
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
          fixWithExplicitBarrelImport: {
            type: 'string',
          },
        },
      },
      minLength: 1,
      maxLength: 1,
    },
    type: 'maintainability',
    typescriptOnly: false,
  };

  public static readonly USE_BARREL_FAILURE_STRING = 'Use barrel (index) files for imports if they are available for path: ';
  public static readonly NO_EXPLICIT_BARRELS_FAILURE_STRING =
    "Don't import barrel files by name, import containing directory instead for path: ";

  public static readonly DEFAULT_OPTIONS = {
    fileExtensions: ['ts', 'js'],
    noExplicitBarrels: false,
    fixWithExplicitBarrelImport: ''
  };

  public apply(sourceFile:SourceFile):RuleFailure[] {
    return this.applyWithWalker(new ImportBarrelsWalker(sourceFile, this.getOptions()));
  }
}

enum CheckResult {
  OK,
  ExplicitBarrelsForbidden,
  NonBarrelImport
}

class ImportBarrelsWalker extends RuleWalker {
  private static readonly resultErrorMap = {
    [CheckResult.NonBarrelImport]: Rule.USE_BARREL_FAILURE_STRING,
    [CheckResult.ExplicitBarrelsForbidden]: Rule.NO_EXPLICIT_BARRELS_FAILURE_STRING,
  };
  private readonly cachedStat = new CachedStat();
  private readonly ruleOptions:typeof Rule.DEFAULT_OPTIONS;

  constructor(sourceFile:SourceFile, options:IOptions) {
    super(sourceFile, options);

    this.ruleOptions = Object.assign({}, Rule.DEFAULT_OPTIONS, this.getOptions()[0] || {});
  }

  protected visitImportDeclaration(node:ImportDeclaration) {
    const moduleExpression = node.moduleSpecifier;
    const expressionCheckResult = this.checkModuleExpression(moduleExpression);

    if (expressionCheckResult !== CheckResult.OK) {
      this.addFailureAtNode(
        moduleExpression,
        ImportBarrelsWalker.resultErrorMap[expressionCheckResult] + moduleExpression.getText(),
        this.getFix(<StringLiteral>moduleExpression, expressionCheckResult)
      );
    }

    super.visitImportDeclaration(node);
  }

  private checkModuleExpression(expression:Expression):CheckResult {
    if (expression.kind !== SyntaxKind.StringLiteral) {
      return CheckResult.OK;
    }

    const modulePathText = (<StringLiteral>expression).text;

    // check only relative paths
    if (!modulePathText.startsWith('.')) {
      return CheckResult.OK;
    }

    const sourceFileRelative = this.getSourceFile().path;
    const sourceFileDirAbsolute = path.resolve(path.dirname(sourceFileRelative));
    const moduleAbsolute = path.normalize(path.resolve(sourceFileDirAbsolute, modulePathText));
    const moduleDirAbsolute = path.dirname(moduleAbsolute);

    // enforce barrel usage only on files that are not in the same directory or in one of the sub-directories
    // of the module
    if (sourceFileDirAbsolute.startsWith(moduleDirAbsolute)) {
      return CheckResult.OK;
    }

    const moduleStats = this.getModuleStats(moduleAbsolute);

    // only file imports are of interest
    if (!moduleStats || moduleStats.isDirectory()) {
      return CheckResult.OK;
    }

    // if module's name is 'index', it must be an explicit barrel import, dirs were excluded earlier
    if (path.parse(moduleAbsolute).name === 'index') {
      return this.ruleOptions.noExplicitBarrels ? CheckResult.ExplicitBarrelsForbidden : CheckResult.OK;
    }

    const dirHasBarrelFile = this.ruleOptions.fileExtensions
      .map(ext => path.join(moduleDirAbsolute, `index.${ext}`))
      .some(file => this.cachedStat.isFile(file));

    return dirHasBarrelFile ? CheckResult.NonBarrelImport : CheckResult.OK;
  }

  private getModuleStats(modulePath:string):fs.Stats|null {
    const modulePathCandidates = [modulePath, ...this.ruleOptions.fileExtensions.map(suffix => `${modulePath}.${suffix}`)];

    let stats:fs.Stats|null = null;
    modulePathCandidates.some(modulePathCandidate => {
      stats = this.cachedStat.statSync(modulePathCandidate);
      return stats !== null;
    });

    return stats;
  }

  private getFix(moduleSpecifier:StringLiteral, checkResult:CheckResult):Fix {
    let replacement = path.dirname(moduleSpecifier.text);

    if (checkResult === CheckResult.NonBarrelImport && this.ruleOptions.fixWithExplicitBarrelImport) {
      replacement += `/${this.ruleOptions.fixWithExplicitBarrelImport}`;
    }

    return new Fix(Rule.metadata.ruleName, [
      // account for quotes
      new Replacement(moduleSpecifier.getStart() + 1, moduleSpecifier.getWidth() - `''`.length, replacement)]);
  }
}
