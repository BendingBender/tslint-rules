import { Fix, IRuleMetadata, Replacement, RuleFailure, Rules, RuleWalker, Utils } from 'tslint/lib';
import { ArrowFunction, CallExpression, Expression, SourceFile, SyntaxKind } from 'typescript';
import { isJasmineDescribe, isJasmineIt, isJasmineSetupTeardown, isJasmineTest } from './utils/jasmineUtils';
import find = require('lodash/find');

export class Rule extends Rules.AbstractRule {
  public static readonly metadata:IRuleMetadata = {
    ruleName: 'jasmine-no-lambda-expression-callbacks',
    description: Utils.dedent`
      Disallows usage of ES6-style lambda expressions as callbacks to Jasmine BDD functions.`,
    rationale: Utils.dedent`
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
    typescriptOnly: false,
  };

  public static readonly FAILURE_STRING = "Don't use lambda expressions as callbacks to jasmine functions";

  public apply(sourceFile:SourceFile):RuleFailure[] {
    return this.applyWithWalker(new JasmineNoLambdaExpressionCallbacksWalker(sourceFile, this.getOptions()));
  }
}

class JasmineNoLambdaExpressionCallbacksWalker extends RuleWalker {
  protected visitSourceFile(node:SourceFile) {
    if (isJasmineTest(node)) {
      super.visitSourceFile(node);
    }
  }

  protected visitCallExpression(node:CallExpression) {
    const invalidLambdaExpression = this.getInvalidLambdaExpression(node);

    if (invalidLambdaExpression) {
      this.addFailureAtNode(invalidLambdaExpression, Rule.FAILURE_STRING, this.getFix(invalidLambdaExpression));
    }

    super.visitCallExpression(node);
  }

  private getInvalidLambdaExpression(node:CallExpression):ArrowFunction|false {
    if (node.expression.kind !== SyntaxKind.Identifier) {
      return false;
    }

    const functionIdentifier = node.expression.getText();
    const functionArgs = node.arguments;

    if ((isJasmineDescribe(functionIdentifier) || isJasmineIt(functionIdentifier)) && functionArgs.length > 1) {
      return this.getLambdaExpressionFromArg(functionArgs[1]) || false;
    } else if (isJasmineSetupTeardown(functionIdentifier) && functionArgs.length > 0) {
      return this.getLambdaExpressionFromArg(functionArgs[0]) || false;
    }

    return false;
  }

  private getLambdaExpressionFromArg(apiArg:Expression):ArrowFunction|null {
    if (apiArg.kind === SyntaxKind.ArrowFunction) {
      return <ArrowFunction>apiArg;
    } else if (apiArg.kind === SyntaxKind.CallExpression) {
      return <ArrowFunction>find((<CallExpression>apiArg).arguments, arg => arg.kind === SyntaxKind.ArrowFunction);
    }

    return null;
  }

  private getFix(lambdaExpression:ArrowFunction):Fix {
    const arrowToken = lambdaExpression.equalsGreaterThanToken;
    const replacements = [
      new Replacement(lambdaExpression.getStart(), 0, 'function'),
      new Replacement(arrowToken.getStart(), lambdaExpression.body.getStart() - arrowToken.getStart(), '')
    ];

    if (lambdaExpression.body.kind !== SyntaxKind.Block) {
      replacements.push(
        new Replacement(lambdaExpression.body.getStart(), 0, '{ return '),
        new Replacement(lambdaExpression.getStart() + lambdaExpression.getWidth(), 0, '; }')
      );
    }

    return new Fix(Rule.metadata.ruleName, replacements);
  }
}
