import { SourceFile, CallExpression, SyntaxKind, Identifier, ArrowFunction, Expression } from 'typescript';
import * as Lint from 'tslint/lib/lint';
import * as includes from 'lodash/includes';
import * as find from 'lodash/find';

export class Rule extends Lint.Rules.AbstractRule {
  public static metadata:Lint.IRuleMetadata = {
    ruleName: 'jasmine-no-lambda-expression-callbacks',
    description: Lint.Utils.dedent`
      Disallows usage of ES6-style lambda expressions as callbacks to Jasmine BDD functions.`,
    rationale: Lint.Utils.dedent`
      Lambda expressions don't create lexical \`this\` bindings in order for \`this\` bindings from outer function scopes to be
      visible inside of lambda expressions. This beats Jasmine's own system of managing shared state by passing in a dictionary object
      as \`this\` reference to the user-provided callbacks to take over the memory management from the JavaScript VM to prevent memory
      leaks during test runs.

      This rule will also check for cases where a call to a function is made with a lambda expression parameter instead of
      passing a lambda expression directly as callback to support Angular 2 test style:
      \`\`\`js
      beforeEach(async(() => {
        ...
      }));
      
      it('something', inject([Service], (service) => {
        ...
      }))
      \`\`\``,
    optionsDescription: 'Not configurable.',
    optionExamples: ['true'],
    options: null,
    type: 'maintainability',
  };

  public static FAILURE_STRING = "Don't use lambda expressions as callbacks to jasmine functions";
  public static JASMINE_BDD_API = [
    'describe',
    'it',
    'fdescribe',
    'fit',
    'xdescribe',
    'xit',
  ];
  public static JASMINE_SETUP_TEARDOWN = [
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
  ];

  public apply(sourceFile:SourceFile):Lint.RuleFailure[] {
    return this.applyWithWalker(new JasmineNoLambdaExpressionCallbacksWalker(sourceFile, this.getOptions()));
  }
}

class JasmineNoLambdaExpressionCallbacksWalker extends Lint.RuleWalker {
  protected visitCallExpression(node:CallExpression) {
    const invalidLambdaExpression = this.getInvalidLambdaExpression(node);

    if (invalidLambdaExpression) {
      this.addFailure(this.createFailure(invalidLambdaExpression.getStart(), invalidLambdaExpression.getWidth(), Rule.FAILURE_STRING));
    }

    super.visitCallExpression(node);
  }

  private getInvalidLambdaExpression(node:CallExpression):ArrowFunction {
    if (node.expression.kind !== SyntaxKind.Identifier) {
      return null;
    }

    const functionIdentifier = (<Identifier>node.expression).text;
    const functionArgs = node.arguments;

    if (includes(Rule.JASMINE_BDD_API, functionIdentifier) && functionArgs.length >= 2) {
      return this.getLambdaExpressionFromArg(functionArgs[1]);
    } else if (includes(Rule.JASMINE_SETUP_TEARDOWN, functionIdentifier) && functionArgs.length >= 1) {
      return this.getLambdaExpressionFromArg(functionArgs[0]);
    }

    return null;
  }

  private getLambdaExpressionFromArg(apiArg:Expression):ArrowFunction {
    if (apiArg.kind === SyntaxKind.ArrowFunction) {
      return <ArrowFunction>apiArg;
    } else if (apiArg.kind === SyntaxKind.CallExpression) {
      return <ArrowFunction>find((<CallExpression>apiArg).arguments, arg => arg.kind === SyntaxKind.ArrowFunction);
    }

    return null;
  }
}
