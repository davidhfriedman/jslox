const { TokenType, Token } = require('./token')
const { Literal, Grouping, Unary, Binary } = require('./ast')

/*
expression -> literal | unary | binary | grouping ;
literal -> NUMBER | STRING | "true" | "false" | "nil" ;
grouping -> "(" expression ")" ;
unary -> ( "-" | "!" ) expression ;
binary -> expression operator expression ;
operator -> "==" | "!=" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/" ;
*/

const error = function(token, message) {
  report(token.line, ` at '${token.lexeme}' ${message}`)
  return new InterpreterError(token, message)
}

class InterpreterError extends Error {
  constructor(token, message) {
    super(`${token} ${message}`)
    this.name = 'InterpreterError'
  }
}

function isTruthy (e) {
  // The Ruby way: false and nil are falsey all else truthy
  if (e === null || e === undefined) { return false }
  else if (e === true || e === false) { return e }
  else { return true }
}

function areEqual(a, b) {
  // TODO: relying on JavaScript coercion. Make semantics more explicit.
  return a == b
}

const InterpreterVisitor = {
  visitLiteral: function (l) { return l.val },
  visitGrouping: function (g) { return g.expr.accept(this) },
  visitUnary: function (u) {
    let e = u.expr.accept(this)
    if (u.operator.type === TokenType.MINUS) {
      // TODO: type check
      e = -e
    } else if (u.operator.type === TokenType.BANG) {
      e = !isTruthy(e)
    } else {
      //throw error(u, "Expected '-' or '!'.")
      e = null
    }
    return e
  },
  visitBinary: function (b) {
    // TODO: later, for short circuiting logical operators, don't evaulate right unless needed
    // NOTE: operators evaluated in left-to-right order. Do we declare this part of the
    // semantics of Lox? Or is it an implementation decision not to be relied on?
    let left = b.left.accept(this)
    let right = b.right.accept(this)
    let e
    // TODO: later, type check left and right before applying the operator
    // currently, javascript coerces and everything just "comes out right"
    switch (b.operator.type) {
    case TokenType.EQUAL_EQUAL:
      e = areEqual(left, right)
      break
    case TokenType.BANG_EQUAL:
      e = !areEqual(left, right)
      break
    case TokenType.LESS:
      e = (left < right)
      break
    case TokenType.LESS_EQUAL:
      e = (left <= right)
      break
    case TokenType.GREATER:
      e = (left > right)
      break
    case TokenType.GREATER_EQUAL:
      e = (left >= right)
      break
    case TokenType.PLUS:
      e = (left + right)
      break
    case TokenType.MINUS:
      e = (left - right)
      break
    case TokenType.STAR:
      e = (left * right)
      break
    case TokenType.SLASH:
      e = (left / right)
      break
    default:
      //throw error(b, `Expected '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/'.`)
      e = null
    }
    return e
  }
}

function interpret(e) {
  return e.accept(InterpreterVisitor)
}

module.exports = { interpret }

