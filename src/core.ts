export type Value = number | boolean;

interface Const {
    kind: 'Const';
    value: Value;
}

interface Variable {
    kind: 'Variable';
    name: string;
}

interface FunctionCall {
    kind: 'FunctionCall';
    func: string;
    arguments: Expr[];
}

interface IfThenElse {
    kind: 'IfThenElse';
    condition: Expr;
    thenCase: Expr;
    elseCase: Expr;
    source: 'statement' | 'expression';
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '>' | '<' | '<=' | '>=' | '==' | '!=' | '===' | '!==';

interface BinaryOp {
    kind: 'BinaryOp';
    op: BinaryOperator;
    lhs: Expr;
    rhs: Expr;
}

export type UnaryOperator = '!' | '-';

interface UnaryOp {
    kind: 'UnaryOp';
    op: UnaryOperator;
    operand: Expr;
}

export type Expr = Const | Variable | FunctionCall | IfThenElse | BinaryOp | UnaryOp;

export interface FunctionDef {
    parameters: string[];
    returnValue: Expr;
}

export interface Input {
    functions: Map<string, FunctionDef>;
    expression: Expr;
}

export function exprToString(expr: Expr): string {
    switch (expr.kind) {
        case 'Const':
            return `${expr.value}`;
        case 'Variable':
            return expr.name;
        case 'UnaryOp':
            return `${expr.op}${exprToString(expr.operand)}`;
        case 'BinaryOp':
            return `(${exprToString(expr.lhs)} ${expr.op} ${exprToString(expr.rhs)})`;
        case 'IfThenElse':
            return `(${exprToString(expr.condition)} ? ${exprToString(expr.thenCase)} : ${exprToString(expr.elseCase)})`;
        case 'FunctionCall': {
            const args = expr.arguments.map((arg) => exprToString(arg)).join(', ');
            return `${expr.func}(${args})`;
        }
    }
}
