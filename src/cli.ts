import { FunctionDef, Expr, exprToString } from './core';
import { evalAllSteps } from './smallstepeval';

function log(expr: Expr) {
    console.log(exprToString(expr));
}

const functions = new Map<string, FunctionDef>([
    [
        'factorial',
        {
            parameters: ['n'],
            returnValue: {
                kind: 'IfThenElse',
                source: 'expression',
                condition: {
                    kind: 'BinaryOp',
                    op: '<=',
                    lhs: { kind: 'Variable', name: 'n' },
                    rhs: { kind: 'Const', value: 0 },
                },
                thenCase: { kind: 'Const', value: 1 },
                elseCase: {
                    kind: 'BinaryOp',
                    op: '*',
                    lhs: { kind: 'Variable', name: 'n' },
                    rhs: {
                        kind: 'FunctionCall',
                        func: 'factorial',
                        arguments: [{ kind: 'BinaryOp', op: '-', lhs: { kind: 'Variable', name: 'n' }, rhs: { kind: 'Const', value: 1 } }],
                    },
                },
            },
        },
    ],
]);

evalAllSteps({ functions, expression: { kind: 'Const', value: 42 } }, log);
console.log();

evalAllSteps({ functions, expression: { kind: 'BinaryOp', op: '+', lhs: { kind: 'Const', value: 42 }, rhs: { kind: 'Const', value: 23 } } }, log);
console.log();

evalAllSteps({ functions, expression: { kind: 'FunctionCall', func: 'factorial', arguments: [{ kind: 'Const', value: 5 }] } }, log);
