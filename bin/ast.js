const { TokenType, Token } = require('./token')
/*
expression -> literal | unary | binary | grouping ;
literal -> NUMBER | STRING | "true" | "false" | "nil" ;
grouping -> "(" expression ")" ;
unary -> ( "-" | "!" ) expression ;
binary -> expression operator expression ;
operator -> "==" | "!=" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/" ;
*/

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

const PPrintVisitor = {
  visitLiteral: function (l) { return `${l.val ? l.val : 'nil'}` },
  visitGrouping: function (g) { return `(group ${g.expr.accept(this)})` },
  visitUnary: function (u) { return `(${u.operator.lexeme} ${u.expr.accept(this)})` },
  visitBinary: function (b) { return `(${b.operator.lexeme} ${b.left.accept(this)} ${b.right.accept(this)})` }
}

function pprint(e) {
  return e.accept(PPrintVisitor)
}

// TODO: name pprint
module.exports = { Literal, Grouping, Unary, Binary, pprint }

