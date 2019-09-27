const { TokenType, Token } = require('./token')
const { pprint } = require('./ast')
const { Environment } = require('./environment')

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

class TypeError extends Error {
  constructor({operator, operand, expected, message = ''}) {
    super(`Type error at line ${operator.line}: '${operator.lexeme}' expects ${expected} got '${operand}' ${message}`)
    this.name = "TypeError"
  }
}

class UninitializedVariableReferenceError extends Error {
  constructor(token) {
    super(`Line ${token.line} Uninitialized variable '${token.lexeme}'`)
    this.name = "UninitializedVariableReferenceError"
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

function typeCheckNumber(operator, operand) {
  if (typeof operand === "number") { return }
  throw new TypeError({ operator: operator, operand: operand, expected: 'number' })
}

function typeCheckNumbers(operator, left, right) {
  if (typeof left === "number" && typeof right === "number" ) { return }
  const operand = (typeof left === "number") ? right : left
  throw new TypeError({ operator: operator, operand: operand, expected: 'number' })
}

function typeCheckNumbersOrStrings(operator, left, right) {
  if (typeof left === "number") {
    if (typeof right === "number" ) {
      return
    } else {
      throw new TypeError({ operator: operator, operand: right, expected: 'number' })
    }
  } else if (typeof left === "string") {
    if (typeof right === "string" ) {
      return
    } else {
      throw new TypeError({ operator: operator, operand: right, expected: 'string' })
    }
  }
}

function Interpreter(mode = null) {
  // in mode "repl" visitProgram returns the value of the top level, which might be an expression
  this.environment = new Environment()
  this.mode = mode
  this.visitProgram = function (p) {
    let r = null
    if (this.mode === "repl") {
      r = p.declarations.map(d => d.accept(this))
      if (r.length === 1) { r = r[0] }
    } else {
      p.declarations.forEach(d => d.accept(this))
    }
    return r
  }
  this.visitVarDeclaration = function (d) {
    let e
    if (d.val) {
      e = d.val.accept(this)
    }
    // TODO - this is gross. Find a better way.
    this.environment.define(d.name.lexeme, e)
    return null
  }
  this.visitPrintStatement = function (s) {
    let e = s.expr.accept(this)
    console.log(e) // print e
    return null
  }
  this.visitWhileStatement = function (w) {
    while (isTruthy(w.condition.accept(this))) {
      w.body.accept(this)
    }
    return null
  }
  this.visitBlockStatement = function (b) {
    // TODO: passing an env parm via the accept method would be more elegant
    let prevEnv = this.environment
    try {
      this.environment = new Environment(this.environment)
      b.declarations.forEach(d => { d.accept(this) } )
      return null
    } finally {
      this.environment = prevEnv
    }
  }
  this.visitIfStatement = function (i) {
    let e = i.condition.accept(this)
    if (e) {
      return i.then.accept(this)
    } else if (i.else) {
      return i.else.accept(this)
    } else {
      return null
    }
  }
  this.visitExpressionStatement = function (s) {
    let e = s.expr.accept(this)
    return e
  }
  this.visitAssignment = function (a) {
    let v = a.value.accept(this)
    this.environment.assign(a.name, v)
    return v
  }
  this.visitLogical = function (l) {
    let left = l.left.accept(this)
    if (l.operator.type === TokenType.OR) {
      if (isTruthy(left)) { return left }
    } else {
      if (!isTruthy(left)) { return left } // TODO ???
    }
    return l.right.accept(this)
  }
  this.visitLiteral = function (l) { return l.val }
  this.visitGrouping = function (g) { return g.expr.accept(this) }
  this.visitUnary = function (u) {
    let e = u.expr.accept(this)
    if (u.operator.type === TokenType.MINUS) {
      typeCheckNumber(u.operator, e)
      e = -e
    } else if (u.operator.type === TokenType.BANG) {
      e = !isTruthy(e)
    } else {
      //throw error(u, "Expected '-' or '!'.")
      e = null
    }
    return e
  }
  this.visitBinary = function (b) {
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
      typeCheckNumbers(b.operator, left, right)
      e = (left < right)
      break
    case TokenType.LESS_EQUAL:
      typeCheckNumbers(b.operator, left, right)
      e = (left <= right)
      break
    case TokenType.GREATER:
      typeCheckNumbers(b.operator, left, right)
      e = (left > right)
      break
    case TokenType.GREATER_EQUAL:
      typeCheckNumbers(b.operator, left, right)
      e = (left >= right)
      break
    case TokenType.PLUS:
      typeCheckNumbersOrStrings(b.operator, left, right)
      e = (left + right)
      break
    case TokenType.MINUS:
      typeCheckNumbers(b.operator, left, right)
      e = (left - right)
      break
    case TokenType.STAR:
      typeCheckNumbers(b.operator, left, right)
      e = (left * right)
      break
    case TokenType.SLASH:
      typeCheckNumbers(b.operator, left, right)
      e = (left / right)
      break
    default:
      //throw error(b, `Expected '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/'.`)
      e = null
    }
    return e
  }
  this.visitVariable = function (v) {
    // TODO - this is gross. Find a better way.
    let value = this.environment.lookup(v.name.lexeme)
    if (value === undefined) { // meta-value for un-initialzed variable
      throw new UninitializedVariableReferenceError(v.name)
    } else {
      return value
    }
  }
  this.interpret = function (e) {
    return e.accept(this)
  }
}

module.exports = { Interpreter }

