const { TokenType, Token } = require('./token')

function Program(declarations) {
  this.declarations = declarations
}

Program.prototype.accept = function (v) { return v.visitProgram(this) }

function VarDeclaration(name, val) {
  this.name = name
  this.val = val
}

VarDeclaration.prototype.accept = function (v) { return v.visitVarDeclaration(this) }

function WhileStatement(condition, body) {
  this.condition = condition
  this.body = body
}

WhileStatement.prototype.accept = function (v) { return v.visitWhileStatement(this) }

function BreakStatement() {
}

BreakStatement.prototype.accept = function (v) { return v.visitBreakStatement(this) }

function Block(declarations) {
  this.declarations = declarations
}

Block.prototype.accept = function (v) { return v.visitBlockStatement(this) }

function IfStatement(condition, whenTrue, whenFalse) {
  this.condition = condition
  this.then = whenTrue
  this.else = whenFalse
}

IfStatement.prototype.accept = function (v) { return v.visitIfStatement(this) }

function ExpressionStatement(expr) {
  this.expr = expr
}

ExpressionStatement.prototype.accept = function (v) { return v.visitExpressionStatement(this) }

function PrintStatement(expr) {
  this.expr = expr
}

PrintStatement.prototype.accept = function (v) { return v.visitPrintStatement(this) }

function Assignment(name, value) {
  this.name = name
  this.value = value
}

Assignment.prototype.accept = function (v) { return v.visitAssignment(this) }

function Logical(left, operator, right) {
  this.left = left
  this.operator = operator
  this.right = right
}

Logical.prototype.accept = function (v) { return v.visitLogical(this) }

function Literal(val) {
  this.val = val
}

Literal.prototype.accept = function (v) { return v.visitLiteral(this) }

function Grouping(expr) {
  this.expr = expr
}

Grouping.prototype.accept = function (v) { return v.visitGrouping(this) }

function Unary(operator, expr) {
  this.operator = operator
  this.expr = expr
}

Unary.prototype.accept = function (v) { return v.visitUnary(this) }

function Call(callee, args, closing_paren) {
  this.callee = callee
  this.args = args // a JavaScript list
  this.closing_paren = closing_paren // a token. use its line number to report run-time errors
}

Call.prototype.accept = function (v) { return v.visitCall(this) }

function Binary(left, operator, right) {
  this.left = left
  this.operator = operator
  this.right = right
}

Binary.prototype.accept = function (v) { return v.visitBinary(this) }

function Variable(name, value) {
  this.name = name
  this.value = value
}

Variable.prototype.accept = function (v) { return v.visitVariable(this) }

const PPrintVisitor = {
  visitProgram: function (p) { return `(program ${p.declarations.map(d => d.accept(this)).join(' ')})` },
  visitVarDeclaration: function (d) { return `(decl ${d.name} ${d.val.accept(this)})` },
  visitBreakStatement: function (b) { return `(break)` },
  visitWhileStatement: function (w) { return `(while ${w.condition.accept(this)} ${w.body.accept(this)})` },
  visitBlockStatement: function (b) { return `(block ${b.declarations.map(d => d.accept(this)).join(' ')})` },
  visitIfStatement: function (i) {
    return `(if ${i.condition.accept(this)} ${i.then.accept(this)}` +
      `${i.else ? i.else.accept(this) : ''})` },
  visitExpressionStatement: function (s) { return `(statement ${s.expr.accept(this)})` },
  visitPrintStatement: function (s) { return `(print ${s.expr.accept(this)})` },
  visitAssignment: function (a) { return `(assign ${a.name} ${a.value.accept(this)})` },
  visitLogical: function (l) { return `(${l.operator.lexeme} ${l.left.accept(this)} ${l.right.accept(this)})` },
  visitLiteral: function (l) { return `${l.val ? l.val : 'nil'}` },
  visitGrouping: function (g) { return `(group ${g.expr.accept(this)})` },
  visitUnary: function (u) { return `(${u.operator.lexeme} ${u.expr.accept(this)})` },
  visitCall: function (c) { return `(call ${c.callee.accept(this)} ${c.args.map(a => a.accept(this)).join(',')} ${c.closing_paren.line})` },
  visitBinary: function (b) { return `(${b.operator.lexeme} ${b.left.accept(this)} ${b.right.accept(this)})` },
  visitVariable: function (v) { return `(var ${v.name} ${v.value}` }
}

function pprint(e) {
  return e.accept(PPrintVisitor)
}

// TODO: name pprint
module.exports = { Program, VarDeclaration,
		   Block, IfStatement, ExpressionStatement, PrintStatement, WhileStatement,
		   BreakStatement,
		   Assignment, Logical,
		   Literal, Grouping, Unary, Call, Binary, Variable,
		   pprint }

