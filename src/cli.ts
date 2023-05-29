import { Expr, FunctionDef, exprToString } from './core';
import { evalStepByStep } from './smallstepeval';
import { parseExpression } from './jsparser';

async function log(expr: Expr) {
    console.log(exprToString(expr));
}

const functions = new Map<string, FunctionDef>([['factorial', { parameters: ['n'], returnValue: parseExpression('n <= 0 ? 1 : n * factorial(n-1)') }]]);

async function main() {
    await evalStepByStep({ functions, expression: parseExpression('42') }, log);
    console.log();

    await evalStepByStep({ functions, expression: parseExpression('42 + 23') }, log);
    console.log();

    await evalStepByStep({ functions, expression: parseExpression('1 * (2 + 3) / 4 - 5 === 6') }, log);
    console.log();

    await evalStepByStep({ functions, expression: parseExpression('factorial(5)') }, log);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
