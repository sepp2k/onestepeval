import { FunctionDef } from './core';
import { evalAllSteps } from './smallstepeval';
import { parseExpression } from './jsparser';

const functions = new Map<string, FunctionDef>([['factorial', { parameters: ['n'], returnValue: parseExpression('n <= 0 ? 1 : n * factorial(n-1)') }]]);

console.log(evalAllSteps({ functions, expression: parseExpression('42') }).join('\n'));
console.log();

console.log(evalAllSteps({ functions, expression: parseExpression('42 + 23') }).join('\n'));
console.log();

console.log(evalAllSteps({ functions, expression: parseExpression('1 * (2 + 3) / 4 - 5 === 6') }).join('\n'));
console.log();

console.log(evalAllSteps({ functions, expression: parseExpression('factorial(5)') }).join('\n'));
