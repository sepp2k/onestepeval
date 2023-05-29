import { evalStepByStep } from './smallstepeval';
import { parseExpression } from './jsparser';
import { Input, exprToString } from './core';

async function evalAllSteps(input: Input): Promise<string[]> {
    const result: string[] = [];
    await evalStepByStep(input, async (expr) => {
        result.push(exprToString(expr));
    });
    return result;
}

async function evalNSteps(n: number, input: Input): Promise<string[]> {
    const result: string[] = [];
    let count = 0;
    try {
        await evalStepByStep(input, async (expr) => {
            result.push(exprToString(expr));
            count++;
            if (count >= n) throw 'break out of iteration';
        });
    } catch (err) {
        if (err !== 'break out of iteration') throw err;
    }
    return result;
}

test('constant expression', async () => {
    expect(await evalAllSteps({ expression: parseExpression('42'), functions: new Map() })).toStrictEqual(['42']);
});

test('simple addition', async () => {
    expect(await evalAllSteps({ expression: parseExpression('42 + 23'), functions: new Map() })).toStrictEqual(['(42 + 23)', '65']);
});

test('more complex arithmetic expression', async () => {
    expect(await evalAllSteps({ expression: parseExpression('1 * (2 + 3) / 4 - 5 === 6 % 7'), functions: new Map() })).toStrictEqual([
        '((((1 * (2 + 3)) / 4) - 5) === (6 % 7))',
        '((((1 * 5) / 4) - 5) === (6 % 7))',
        '(((5 / 4) - 5) === (6 % 7))',
        '((1.25 - 5) === (6 % 7))',
        '(-3.75 === (6 % 7))',
        '(-3.75 === 6)',
        'false',
    ]);
});

test('negative numbers', async () => {
    expect(await evalAllSteps({ expression: parseExpression('-42 > -(23+13)'), functions: new Map() })).toStrictEqual([
        '(-42 > -(23 + 13))',
        '(-42 > -(23 + 13))',
        '(-42 > -36)',
        '(-42 > -36)',
        'false',
    ]);
});

test('boolean operations', async () => {
    const functions = new Map([
        ['and', { parameters: ['a', 'b'], returnValue: parseExpression('a ? b : a') }],
        ['or', { parameters: ['a', 'b'], returnValue: parseExpression('a ? a : b') }],
        ['not', { parameters: ['x'], returnValue: parseExpression('!x') }],
    ]);
    expect(
        await evalAllSteps({ expression: parseExpression('!and(or(not(1 < 2), !(3 >= 4)), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))'), functions })
    ).toStrictEqual([
        '!and(or(not((1 < 2)), !(3 >= 4)), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(or(not(true), !(3 >= 4)), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(or(!true, !(3 >= 4)), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(or(false, !(3 >= 4)), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(or(false, !false), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(or(false, true), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and((false ? false : true), or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(true, or(!(5 == 6), and(!(7 != 8), !(9 !== 10))))',
        '!and(true, or(!false, and(!(7 != 8), !(9 !== 10))))',
        '!and(true, or(true, and(!(7 != 8), !(9 !== 10))))',
        '!and(true, or(true, and(!true, !(9 !== 10))))',
        '!and(true, or(true, and(false, !(9 !== 10))))',
        '!and(true, or(true, and(false, !true)))',
        '!and(true, or(true, and(false, false)))',
        '!and(true, or(true, (false ? false : false)))',
        '!and(true, or(true, false))',
        '!and(true, (true ? true : false))',
        '!and(true, true)',
        '!(true ? true : true)',
        '!true',
        'false',
    ]);
});

test('factorial function', async () => {
    const functions = new Map([['factorial', { parameters: ['n'], returnValue: parseExpression('n <= 0 ? 1 : n * factorial(n-1)') }]]);
    expect(await evalAllSteps({ expression: parseExpression('factorial(2)'), functions })).toStrictEqual([
        'factorial(2)',
        '((2 <= 0) ? 1 : (2 * factorial((2 - 1))))',
        '(false ? 1 : (2 * factorial((2 - 1))))',
        '(2 * factorial((2 - 1)))',
        '(2 * factorial(1))',
        '(2 * ((1 <= 0) ? 1 : (1 * factorial((1 - 1)))))',
        '(2 * (false ? 1 : (1 * factorial((1 - 1)))))',
        '(2 * (1 * factorial((1 - 1))))',
        '(2 * (1 * factorial(0)))',
        '(2 * (1 * ((0 <= 0) ? 1 : (0 * factorial((0 - 1))))))',
        '(2 * (1 * (true ? 1 : (0 * factorial((0 - 1))))))',
        '(2 * (1 * 1))',
        '(2 * 1)',
        '2',
    ]);
});

test('infinite recursion', async () => {
    const functions = new Map([['infty', { parameters: ['i'], returnValue: parseExpression('infty(i+1)') }]]);
    expect(await evalNSteps(10, { expression: parseExpression('infty(0)'), functions })).toStrictEqual([
        'infty(0)',
        'infty((0 + 1))',
        'infty(1)',
        'infty((1 + 1))',
        'infty(2)',
        'infty((2 + 1))',
        'infty(3)',
        'infty((3 + 1))',
        'infty(4)',
        'infty((4 + 1))',
    ]);
});
