import * as ts from 'typescript';
import * as core from './core';

export function parseExpression(expr: string): core.Expr {
    const program = ts.createSourceFile('<expression>', expr, ts.ScriptTarget.ES2022);
    if (program.statements.length != 1) throw new Error('Expected single expression, got multiple statements.');
    const statement = program.statements[0];
    if (!ts.isExpressionStatement(statement)) throw new Error(`Expected expression, got ${statement.kind}`);
    return tsAstToCoreExpression(statement.expression);
}

const unaryOperatorMapping = new Map([
    [ts.SyntaxKind.MinusToken, core.UnaryOperator['-']],
    [ts.SyntaxKind.ExclamationToken, core.UnaryOperator['!']],
]);

const binaryOperatorMapping = new Map([
    [ts.SyntaxKind.PlusToken, core.BinaryOperator['+']],
    [ts.SyntaxKind.MinusToken, core.BinaryOperator['-']],
    [ts.SyntaxKind.AsteriskToken, core.BinaryOperator['*']],
    [ts.SyntaxKind.SlashToken, core.BinaryOperator['/']],
    [ts.SyntaxKind.PercentToken, core.BinaryOperator['%']],
    [ts.SyntaxKind.GreaterThanToken, core.BinaryOperator['>']],
    [ts.SyntaxKind.LessThanToken, core.BinaryOperator['<']],
    [ts.SyntaxKind.GreaterThanEqualsToken, core.BinaryOperator['>=']],
    [ts.SyntaxKind.LessThanEqualsToken, core.BinaryOperator['<=']],
    [ts.SyntaxKind.EqualsEqualsToken, core.BinaryOperator['==']],
    [ts.SyntaxKind.ExclamationEqualsToken, core.BinaryOperator['!=']],
    [ts.SyntaxKind.EqualsEqualsEqualsToken, core.BinaryOperator['===']],
    [ts.SyntaxKind.ExclamationEqualsEqualsToken, core.BinaryOperator['!==']],
]);

function tsAstToCoreExpression(ast: ts.Expression): core.Expr {
    switch (ast.kind) {
        case ts.SyntaxKind.Identifier:
            return { kind: 'Variable', name: (ast as ts.Identifier).text };
        case ts.SyntaxKind.NumericLiteral:
            return { kind: 'Const', value: +(ast as ts.NumericLiteral).text };
        case ts.SyntaxKind.ParenthesizedExpression:
            return tsAstToCoreExpression((ast as ts.ParenthesizedExpression).expression);
        case ts.SyntaxKind.PrefixUnaryExpression: {
            const unaryExpr = ast as ts.PrefixUnaryExpression;
            const op = unaryOperatorMapping.get(unaryExpr.operator);
            if (op === undefined) throw new Error(`Unsupported unary operator at '${unaryExpr.pos}'`);
            return { kind: 'UnaryOp', operand: tsAstToCoreExpression(unaryExpr.operand), op };
        }
        case ts.SyntaxKind.BinaryExpression: {
            const binaryExpr = ast as ts.BinaryExpression;
            const op = binaryOperatorMapping.get(binaryExpr.operatorToken.kind);
            if (op === undefined) throw new Error(`Unsupported binary operator at '${binaryExpr.operatorToken.pos}'`);
            return { kind: 'BinaryOp', lhs: tsAstToCoreExpression(binaryExpr.left), rhs: tsAstToCoreExpression(binaryExpr.right), op };
        }
        case ts.SyntaxKind.CallExpression: {
            const call = ast as ts.CallExpression;
            if (!ts.isIdentifier(call.expression)) throw new Error('Calls of anything but a function name are not supported');
            const func = call.expression.text;
            const args = call.arguments.map((arg) => tsAstToCoreExpression(arg));
            return { kind: 'FunctionCall', func, arguments: args };
        }
        case ts.SyntaxKind.ConditionalExpression: {
            const conditionalExpr = ast as ts.ConditionalExpression;
            const condition = tsAstToCoreExpression(conditionalExpr.condition);
            const thenCase = tsAstToCoreExpression(conditionalExpr.whenTrue);
            const elseCase = tsAstToCoreExpression(conditionalExpr.whenFalse);
            return { kind: 'IfThenElse', source: 'expression', condition, thenCase, elseCase };
        }
        default:
            throw new Error(`Unsupported type of expression: ${ts.SyntaxKind[ast.kind]}`);
    }
}
