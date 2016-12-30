import {
  Block,
  CallExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  SourceFile,
  Statement,
  SyntaxKind
} from 'typescript';
import includes = require('lodash/includes');
import { getIIFEExpressionBody } from './languageUtils';

const JASMINE_DESCRIBE = [
  'describe',
  'fdescribe',
  'xdescribe',
];
const JASMINE_IT = [
  'it',
  'fit',
  'xit',
];
const JASMINE_SETUP_TEARDOWN = [
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
];

export function isJasmineTest(node:SourceFile):boolean {
  return includesJasmineTopLevelCalls(node.statements) || node.statements.find(isStatementWithWrappedJasmineCalls) != null;
}

export function isJasmineDescribe(callExpressionText:string):boolean {
  return includes(JASMINE_DESCRIBE, callExpressionText);
}

export function isJasmineIt(callExpressionText:string):boolean {
  return includes(JASMINE_IT, callExpressionText);
}

export function isJasmineSetupTeardown(callExpressionText:string):boolean {
  return includes(JASMINE_SETUP_TEARDOWN, callExpressionText);
}

function isStatementWithWrappedJasmineCalls(statement:Statement):boolean {
  let functionBody:Block|null|undefined;

  if (statement.kind === SyntaxKind.FunctionDeclaration) {
    functionBody = (<FunctionDeclaration>statement).body;
  } else if (statement.kind === SyntaxKind.ExpressionStatement) {
    functionBody = getIIFEExpressionBody((<ExpressionStatement>statement).expression);
  }

  if (functionBody != null) {
    return includesJasmineTopLevelCalls(functionBody.statements);
  }

  return false;
}

function includesJasmineTopLevelCalls(statements:Statement[]):boolean {
  return statements.find(statement => isStatementJasmineTopLevelCall(statement)) != null;
}

function isStatementJasmineTopLevelCall(statement:Statement):boolean {
  if (statement.kind === SyntaxKind.ExpressionStatement) {
    const expression:Expression = (<ExpressionStatement>statement).expression;

    if (expression.kind === SyntaxKind.CallExpression) {
      const call:CallExpression = <CallExpression>expression;
      const expressionText:string = call.expression.getText();
      return isJasmineDescribe(expressionText) || isJasmineSetupTeardown(expressionText);
    }
  }

  return false;
}
