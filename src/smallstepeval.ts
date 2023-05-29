import { Expr, Input, UnaryOperator, BinaryOperator, Value } from './core';

function applyUnaryOp(op: UnaryOperator, operand: Value): Value {
    switch (op) {
        case UnaryOperator['!']:
            return !operand;
        case UnaryOperator['-']:
            return -operand;
    }
}

function applyBinaryOp(op: BinaryOperator, lhs: Value, rhs: Value): Value {
    switch (op) {
        case BinaryOperator['+']:
            return +lhs + +rhs;
        case BinaryOperator['-']:
            return +lhs - +rhs;
        case BinaryOperator['*']:
            return +lhs * +rhs;
        case BinaryOperator['/']:
            return +lhs / +rhs;
        case BinaryOperator['%']:
            return +lhs % +rhs;
        case BinaryOperator['>']:
            return lhs > rhs;
        case BinaryOperator['<']:
            return lhs < rhs;
        case BinaryOperator['<=']:
            return lhs <= rhs;
        case BinaryOperator['>=']:
            return lhs >= rhs;
        case BinaryOperator['==']:
            return lhs == rhs;
        case BinaryOperator['!=']:
            return lhs != rhs;
        case BinaryOperator['===']:
            return lhs === rhs;
        case BinaryOperator['!==']:
            return lhs !== rhs;
    }
}

function substitute(expr: Expr, substitutions: Map<string, Expr>): Expr {
    switch (expr.kind) {
        case 'Const':
            return expr;
        case 'Variable': {
            const value = substitutions.get(expr.name);
            if (value === undefined) throw new Error(`Unbound variable: ${expr.name}`);
            return value;
        }
        case 'UnaryOp':
            return {
                kind: 'UnaryOp',
                op: expr.op,
                operand: substitute(expr.operand, substitutions),
            };
        case 'BinaryOp':
            return {
                kind: 'BinaryOp',
                op: expr.op,
                lhs: substitute(expr.lhs, substitutions),
                rhs: substitute(expr.rhs, substitutions),
            };
        case 'IfThenElse': {
            const condition = substitute(expr.condition, substitutions);
            const thenCase = substitute(expr.thenCase, substitutions);
            const elseCase = substitute(expr.elseCase, substitutions);
            return {
                kind: 'IfThenElse',
                source: expr.source,
                condition,
                thenCase,
                elseCase,
            };
        }
        case 'FunctionCall':
            return {
                kind: 'FunctionCall',
                func: expr.func,
                arguments: expr.arguments.map((arg) => substitute(arg, substitutions)),
            };
    }
}

export async function evalStepByStep(input: Input, callback: (expr: Expr) => Promise<void>): Promise<void> {
    const functions = input.functions;
    let root = input.expression;

    async function e(expr: Expr): Promise<Expr> {
        switch (expr.kind) {
            case 'Variable':
                throw new Error(`Unbound variable: ${expr.name}`);
            case 'Const':
                throw new Error(`Expression has already been evaluated`);
            case 'UnaryOp': {
                while (expr.operand.kind !== 'Const') {
                    expr.operand = await e(expr.operand);
                    await callback(root);
                }
                return {
                    kind: 'Const',
                    value: applyUnaryOp(expr.op, expr.operand.value),
                };
            }
            case 'BinaryOp': {
                while (expr.lhs.kind !== 'Const') {
                    expr.lhs = await e(expr.lhs);
                    await callback(root);
                }
                while (expr.rhs.kind !== 'Const') {
                    expr.rhs = await e(expr.rhs);
                    await callback(root);
                }
                return {
                    kind: 'Const',
                    value: applyBinaryOp(expr.op, expr.lhs.value, expr.rhs.value),
                };
            }
            case 'IfThenElse': {
                while (expr.condition.kind !== 'Const') {
                    expr.condition = await e(expr.condition);
                    await callback(root);
                }
                if (expr.condition.value) {
                    return expr.thenCase;
                } else {
                    return expr.elseCase;
                }
            }
            case 'FunctionCall': {
                const func = functions.get(expr.func);
                if (func === undefined) throw new Error(`Undefined function ${expr.func}`);
                if (func.parameters.length !== expr.arguments.length) {
                    throw new Error(`Wrong number of arguments to ${func}: ${expr.arguments.length} for ${func.parameters.length}`);
                }
                for (const i in func.parameters) {
                    while (expr.arguments[i].kind !== 'Const') {
                        expr.arguments[i] = await e(expr.arguments[i]);
                        await callback(root);
                    }
                }
                return substitute(func.returnValue, new Map(func.parameters.map((param, i) => [param, expr.arguments[i]])));
            }
        }
    }

    await callback(root);
    while (root.kind !== 'Const') {
        root = await e(root);
        await callback(root);
    }
}
