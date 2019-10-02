const { TokenType, Token } = require('./token')
const { pprint } = require('./ast')
const { Environment } = require('./environment')
const { report } = require('./errors')

const error = function(token, message) {
  report(token.line, ` at '${token.lexeme}' ${message}`)
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

function Interpreter(mode = null) {
  // in mode "repl" visitProgram returns the value of the top level, which might be an expression
  this.environment = new Environment()
  this.globals = this.environment

  this.globals.define("clock", { arity: function() { return 0 },
				 call: function(interpreter, args) {
				   return Math.round(Date.now() / 1000)
				 },
				 toString: function() { return `<builtin 'clock'>`; }
			       })
  this.mode = mode
  this.loopLevel = 0
  this.inFunction = false
  
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
      toString: function() { return `<fn '${this.decl.name.lexeme}>` },
      call: function(interpreter, args) {
	const env = new Environment(this.closure)
	this.decl.params.forEach((p,i) => env.define(p.lexeme, args[i]))
	interpreter.interpretBlock(env, this.decl.body)
      }
    }
    this.environment.define(f.name.lexeme, func)
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
    console.log(e) // print e
    return null
  }
  this.visitBreakStatement = function (b) {
    if (this.loopLevel === 0) {
      throw new InterpreterError(b, `break statement outside loop`)
    } else {
      // console.log("BREAK throw exception") // TEST
      throw new BreakException()
    }
  }
  this.visitReturnStatement = function (r) {
    if (!this.inFunction) {
      throw new InterpreterError(r, `return statement outside function body`)
    } else {
      let value = null
      if (r.value != null) {
	value = r.value.accept(this)
      }
      throw new ReturnException(value)
    }
  }
  this.visitWhileStatement = function (w) {
    this.loopLevel++
    let broken = false
    while (!broken && isTruthy(w.condition.accept(this))) {
      try {
	w.body.accept(this)
      } catch (e) {
	if (e instanceof BreakException) {
	  // console.log("WHILE caught break") // TEST
	  broken = true
	} else {
	  // console.log("WHILE caught NON-BREAK", e) // TEST
	  throw e
	}
      }
    }
    // TODO - throw exception if we're at 0
    this.loopLevel--
    return null
  }
  this.interpretBlock = function(env, block) {
    let prevEnv = this.environment
    try {
      this.environment = new Environment(env)
      // console.log("BLOCK new env", this.environment) // TEST
      block.forEach(d => { d.accept(this) } )
      return null
    } finally {
      this.environment = prevEnv
      // console.log("BLOCK finally", this.environment) // TEST
    }
  }
  this.visitBlockStatement = function (b) {
    // TODO: passing an env parm via the accept method would be more elegant
    // console.log("BLOCK entry", this.environment) // TEST
    this.interpretBlock(this.environment, b.declarations)
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
  this.visitCall = function (c) {
    const callee = c.callee.accept(this)
    const args = c.args.map(a => a.accept(this))
    if (!this.isCallable(callee)) {
      throw error(c.closing_paren, `Can only call functions and classes.`)
    }
    if (args.length != callee.arity()) {
      throw error(c.closing_paren, `Expected ${callee.arity()} arguments but got ${args.length}.`)
    }
    this.inFunction = true
    let returnValue = null
    try {
      callee.call(this, args)
    } catch (e) {
      if (e instanceof ReturnException) {
	returnValue = e.value
	// console.log("Function caught RETURN", e, returnValue) // TEST
      } else {
	// console.log("Function caught NON-RETURN", e) // TEST
	throw e
      }
    } finally {
      this.inFunction = false
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

/*
BREAK statement.

I implemented it by allowing break anywhere syntactically; the
interpreter counts nesting depth incrementing on every while and
raises a runtime error if it encounters a break when the count is
zero. The for statement is syntactic sugar so is handled by while;
if we add new iteration constructs they will have to bump the depth
count too. This is fragile - it would be an easy bug to fail to
increment or decrement the count, and there are no safety checks for
underflow to negative, and I don't know what a reasonable overflow
check would be - arbitrary nesting depth is an unattractive
option. It would be preferable to handle break syntactically -
allowed only in the body of a while by grammar rules - but then
there would beed to be redudndant grammar rules for statements in a
loop and not in a loop.

Because the interpreter is implemented by the visitor pattern, the
only way I could think of to implement the break semantics was by
throwing an exception in the break function that is caught in the
while function. (Because a throw searches up the execution stack for
the most recent catch, the dynamically innermost loop will be exited
as required by breaks semantics.) I thought about setting an
interpreter global in the break function that the interpreter while
loop could check after each statement in the while loop. Perhaps that
would have been better.

Any local environments within the while loop get released normally,
by the finally clause in the block statement visitor function.
*/
