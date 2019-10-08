const { TokenType, Token } = require('./token')
const { pprint } = require('./ast')
const { Environment } = require('./environment')
const { report } = require('./errors')

const error = function(token, message) {
  report(token.line, token.lexeme, message)
  return new InterpreterError(token, message)
}

class InterpreterError extends Error {
  constructor(token, message) {
    super(`${token.line}: '${token.lexeme}' ${message}`)
    this.name = 'InterpreterError'
  }
}

class BreakException {
}

class ReturnException {
  constructor(value) {
    this.value = value
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

/* Interface Callable { arity() {}, call(interpreter, args) {} } */

function CreateInstance (clss) {
  return {
    "class": clss,
    toString: function () { return `<${this["class"]} instance>` }
  }
}

function Interpreter(mode = null) {
  // in mode "repl" visitProgram returns the value of the top level, which might be an expression
  this.environment = new Environment()
  this.globals = this.environment
  // 'locals' is a map from an ast node to the contour depth (distance
  // from current environment to encosing environment in which to find
  // variable binding, calculated by resolver static semantic analysis
  // pass
  this.locals = new Map()

  // user-defined functions return null or a return value via an exception
  // built-ins just return their value. they could throw an exception for
  // consistency with function calls, but classes return instances so we
  // have that pathway for return values already.
  this.globals.define("clock", { arity: function() { return 0 },
				 call: function(interpreter, args) {
				   return Math.round(Date.now() / 1000)
				 },
				 toString: function() { return `<builtin 'clock'>`; }
			       })
  this.mode = mode

  this.isCallable = function (o) { return o !== null && typeof o === 'object' && 'arity' in o && 'call' in o }

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
  this.visitFunDeclaration = function (f) {
    const func = {
      decl: f,
      closure: this.environment,
      arity: function() { return this.decl.params.length },
      toString: function() { return `<fn '${this.decl.name.lexeme}'>` },
      call: function(interpreter, args) {
	const env = new Environment(this.closure)
	this.decl.params.forEach((p,i) => env.define(p.lexeme, args[i]))
	interpreter.interpretBlock(env, this.decl.body)
	return null
      }
    }
    this.environment.define(f.name.lexeme, func)
    return null
  }
  this.visitClassDeclaration = function (c) {
    this.environment.define(c.name.lexeme, null)
    const clss = {
      arity: function() { return 0 },
      call: function(interpreter) {
	const instance = new CreateInstance(this)
	return instance
      },
      name: c.name.lexeme,
      toString: function() { return this.name }
    }
    this.environment.assign(c.name, clss)
    return null
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
    console.log(e && e.toString ? e.toString() : e) // print e
    return null
  }
  this.visitBreakStatement = function (b) {
    // resolver ensures break only inside loop
    throw new BreakException()
  }
  this.visitReturnStatement = function (r) {
    // Resolver ensures return only from function body
    let value = null
    if (r.value != null) {
      value = r.value.accept(this)
    }
    throw new ReturnException(value)
  }
  this.visitWhileStatement = function (w) {
    let broken = false
    while (!broken && isTruthy(w.condition.accept(this))) {
      try {
	w.body.accept(this)
      } catch (e) {
	if (e instanceof BreakException) {
	  broken = true
	} else {
	  throw e
	}
      }
    }
    return null
  }
  this.interpretBlock = function(env, block) {
    let prevEnv = this.environment
    try {
      this.environment = env
      block.forEach(d => { d.accept(this) } )
      return null
    } finally {
      this.environment = prevEnv
    }
  }
  this.visitBlockStatement = function (b) {
    // TODO: passing an env parm via the accept method would be more elegant
    this.interpretBlock(new Environment(this.environment), b.declarations)
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
    let distance = this.locals.get(a)
    if (distance != undefined) {
      this.environment.assignAt(distance, a.name, v)
    } else {
      this.globals.assign(a.name, v)
    }
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
  this.visitCall = function (c) {
    const callee = c.callee.accept(this)
    const args = c.args.map(a => a.accept(this))
    if (!this.isCallable(callee)) {
      throw error(c.closing_paren, `Can only call functions and classes.`)
    }
    if (args.length != callee.arity()) {
      throw error(c.closing_paren, `Expected ${callee.arity()} arguments but got ${args.length}.`)
    }
    let returnValue
    // if callee is a class, it will return an instance.
    // if callee is a function, it will return null if there is no return statement
    try {
      returnValue = callee.call(this, args)
    } catch (e) {
      if (e instanceof ReturnException) {
	returnValue = e.value
      } else {
	throw e
      }
    }
    return returnValue
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
    const distance = this.locals.get(v)
    if (distance != undefined) {
      return this.environment.lookupAt(distance, v.name.lexeme)
    } else {
      return this.globals.lookup(v.name.lexeme)
    }
  }
  this.resolve = function (expr, depth) {
    // interface for the variable resolution semantic analysis pass
    // the token is a variable or assignment expression
    // store the number of environments between the current and the
    // enclosing at which to find the value
    this.locals.set(expr, depth)
  }

  this.interpret = function (e) {
    return e.accept(this)
  }
}

module.exports = { Interpreter }
