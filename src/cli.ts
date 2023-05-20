import { FunctionDef, Expr, exprToString } from './core';
import { evalAllSteps } from './smallstepeval';
import { parseExpression } from './jsparser';

function log(expr: Expr) {
    console.log(exprToString(expr));
}

const functions = new Map<string, FunctionDef>([['factorial', { parameters: ['n'], returnValue: parseExpression('n <= 0 ? 1 : n * factorial(n-1)') }]]);

evalAllSteps({ functions, expression: parseExpression('42') }, log);
console.log();

evalAllSteps({ functions, expression: parseExpression('42 + 23') }, log);
console.log();

evalAllSteps({ functions, expression: parseExpression('1 * (2 + 3) / 4 - 5 === 6') }, log);
console.log();

evalAllSteps({ functions, expression: parseExpression('factorial(5)') }, log);
