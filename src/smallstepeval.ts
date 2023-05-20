import { Expr, Input, FunctionDef, UnaryOperator, BinaryOperator, Value } from './core';

interface ExprRef {
    next: ExprRef | undefined;

    get value(): Expr;
    set value(expr: Expr);
}

function exprRef<K extends string | number>(parent: { [key in K]: Expr }, key: K): ExprRef {
    return new ExprRefImpl(parent, key);
}

class ExprRefImpl<K extends string | number> implements ExprRef {
    parent: { [key in K]: Expr };
    key: K;
    next: ExprRef | undefined;

    constructor(parent: { [key in K]: Expr }, key: K) {
        this.parent = parent;
        this.key = key;
    }

    get value(): Expr {
        return this.parent[this.key];
    }

    set value(expr: Expr) {
        this.parent[this.key] = expr;
    }
}

export class Evaluator {
    root: Expr;
    functions: Map<string, FunctionDef>;
    current: ExprRef;

    constructor(input: Input) {
        this.root = input.expression;
        this.functions = input.functions;
        this.current = Evaluator.updateRefs(exprRef(this, 'root'), undefined);
    }

    static updateRefs(node: ExprRef, next: ExprRef | undefined): ExprRef {
        node.next = next;
        switch (node.value.kind) {
            case 'Variable':
                throw new Error(`Unbound variable: ${node.value.name}`);
            case 'Const':
                if (next === undefined) return node;
                else return next;
            case 'UnaryOp':
                return this.updateRefs(exprRef(node.value, 'operand'), node);
            case 'BinaryOp':
                return this.updateRefs(exprRef(node.value, 'lhs'), this.updateRefs(exprRef(node.value, 'rhs'), node));
            case 'IfThenElse':
                return this.updateRefs(exprRef(node.value, 'condition'), node);
            case 'FunctionCall': {
                let current: ExprRef = node;
                const args = node.value.arguments;
                for (let i = args.length - 1; i >= 0; i--) {
                    current = this.updateRefs(exprRef(args, i), current);
                }
                return current;
            }
        }
    }

    static getValue(expr: Expr): boolean | number {
        switch (expr.kind) {
            case 'Const':
                return expr.value;
            default:
                throw new Error(`getValue called on unevaluated operand ${expr}`);
        }
    }

    static applyUnaryOp(op: UnaryOperator, operand: Value): Value {
        switch (op) {
            case UnaryOperator['!']:
                return !operand;
            case UnaryOperator['-']:
                return -operand;
        }
    }

    static applyBinaryOp(op: BinaryOperator, lhs: Value, rhs: Value): Value {
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

    stepOnce(): void {
        switch (this.current.value.kind) {
            case 'Variable':
                throw new Error(`Unbound variable: ${this.current.value.name}`);
            case 'Const':
                throw new Error('stepOnce called after evaluation was finished');
            case 'UnaryOp': {
                const operand = Evaluator.getValue(this.current.value.operand);
                this.current.value = {
                    kind: 'Const',
                    value: Evaluator.applyUnaryOp(this.current.value.op, operand),
                };
                break;
            }
            case 'BinaryOp': {
                const lhs = Evaluator.getValue(this.current.value.lhs);
                const rhs = Evaluator.getValue(this.current.value.rhs);
                this.current.value = {
                    kind: 'Const',
                    value: Evaluator.applyBinaryOp(this.current.value.op, lhs, rhs),
                };
                break;
            }
            case 'IfThenElse': {
                if (Evaluator.getValue(this.current.value.condition)) {
                    this.current.value = this.current.value.thenCase;
                    this.current = Evaluator.updateRefs(this.current, this.current.next);
                } else {
                    this.current.value = this.current.value.elseCase;
                    this.current = Evaluator.updateRefs(this.current, this.current.next);
                }
                break;
            }
            case 'FunctionCall': {
                const name = this.current.value.func;
                const args = this.current.value.arguments;
                const func = this.functions.get(name);
                if (func === undefined) throw new Error(`Undefined function ${name}`);
                if (func.parameters.length !== args.length) {
                    throw new Error(`Wrong number of arguments to ${func}: ${arguments.length} for ${func.parameters.length}`);
                }
                const returnExpr = Evaluator.substitute(func.returnValue, new Map(func.parameters.map((param, i) => [param, args[i]])));
                this.current.value = returnExpr;
                this.current = Evaluator.updateRefs(this.current, this.current.next);
                break;
            }
        }
        if (this.current.value.kind === 'Const' && this.current.next !== undefined) {
            this.current = this.current.next;
        }
    }

    static substitute(expr: Expr, substitutions: Map<string, Expr>): Expr {
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
                    operand: this.substitute(expr.operand, substitutions),
                };
            case 'BinaryOp':
                return {
                    kind: 'BinaryOp',
                    op: expr.op,
                    lhs: this.substitute(expr.lhs, substitutions),
                    rhs: this.substitute(expr.rhs, substitutions),
                };
            case 'IfThenElse': {
                const condition = this.substitute(expr.condition, substitutions);
                const thenCase = this.substitute(expr.thenCase, substitutions);
                const elseCase = this.substitute(expr.elseCase, substitutions);
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
                    arguments: expr.arguments.map((arg) => this.substitute(arg, substitutions)),
                };
        }
    }

    eval(callback: (expr: Expr) => void) {
        while (this.root.kind !== 'Const') {
            callback(this.root);
            this.stepOnce();
        }
        callback(this.root);
    }
}

export function evalAllSteps(input: Input, callback: (expr: Expr) => void) {
    return new Evaluator(input).eval(callback);
}
