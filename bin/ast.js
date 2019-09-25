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

function PrintStatement(expr) {
  this.expr = expr
}

PrintStatement.prototype.accept = function (v) { return v.visitPrintStatement(this) }

function ExpressionStatement(expr) {
  this.expr = expr
}

ExpressionStatement.prototype.accept = function (v) { return v.visitExpressionStatement(this) }

function Assignment(name, value) {
  this.name = name
  this.value = value
}

Assignment.prototype.accept = function (v) { return v.visitAssignment(this) }

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
  visitExpressionStatement: function (s) { return `(statement ${s.expr.accept(this)})` },
  visitPrintStatement: function (s) { return `(print ${s.expr.accept(this)})` },
  visitAssignment: function (a) { return `(assign ${a.name} ${a.value.accept(this)})` },
  visitLiteral: function (l) { return `${l.val ? l.val : 'nil'}` },
  visitGrouping: function (g) { return `(group ${g.expr.accept(this)})` },
  visitUnary: function (u) { return `(${u.operator.lexeme} ${u.expr.accept(this)})` },
  visitBinary: function (b) { return `(${b.operator.lexeme} ${b.left.accept(this)} ${b.right.accept(this)})` },
  visitVariable: function (v) { return `(var ${v.name} ${v.value}` }
}

function pprint(e) {
  return e.accept(PPrintVisitor)
}

// TODO: name pprint
module.exports = { Program, VarDeclaration, PrintStatement, ExpressionStatement,
		   Assignment, Literal, Grouping, Unary, Binary, Variable,
		   pprint }

