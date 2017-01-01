import { unwrapParentheses } from 'tslint';
import { Block, CallExpression, Expression, FunctionExpression, SyntaxKind } from 'typescript';

export function getIIFEExpressionBody(expression:Expression):Block|null {
  if (expression.kind === SyntaxKind.CallExpression) {
    const callExpression = <CallExpression>expression;
    if (callExpression.expression.kind === SyntaxKind.ParenthesizedExpression) {
      const parensContentExpression = unwrapParentheses(callExpression.expression);
      if (parensContentExpression.kind === SyntaxKind.FunctionExpression || parensContentExpression.kind === SyntaxKind.ArrowFunction) {
        return (<FunctionExpression>parensContentExpression).body;
      }
    }
  } else if (expression.kind === SyntaxKind.ParenthesizedExpression) {
    const parensContentExpression = unwrapParentheses(expression);
    if (parensContentExpression.kind === SyntaxKind.CallExpression) {
      const calleeExpression = (<CallExpression>parensContentExpression).expression;
      if (calleeExpression.kind === SyntaxKind.FunctionExpression) {
        return (<FunctionExpression>calleeExpression).body;
      }
    }
  }

  return null;
}
