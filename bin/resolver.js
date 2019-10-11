const { report } = require('./errors')

const error = function(token, message) {
  report(token.line, token.lexeme, message)
  return new ResolverError(token, message)
}

class ResolverError extends Error {
  constructor(token, message) {
    super(`${token.line}: '${token.lexeme}' ${message}`)
    this.name = 'ResolverError'
  }
}

function Stack() {
  this.stack = []
  this.push = function(s) {
    this.stack.push(s)
  }
  this.pop = function() {
    if (this.empty()) {
      throw "Pop of empty scope stack"
    } else {
      return this.stack.pop()
    }
  }
  this.peek = function() {
    if (this.empty()) {
      throw "Peek of empty scope stack"
    } else {
      return this.stack[this.stack.length-1]
    }
  }
  this.empty = function() {
    return this.stack.length === 0
  }
}

function Resolver(interpreter) {
  this.interpreter = interpreter
  this.scopes = new Stack()
  this.inFunction = false
  this.inClass = false
  this.hasSuperClass = false
  this.inInitializer = false
  this.loopLevel = 0
  
  this.beginScope = function () {
    this.scopes.push({})
  }

  this.endScope = function () {
    this.scopes.pop()
  }

  this.declare = function (name) {
    if (this.scopes.empty()) {
      return
    }
    const scope = this.scopes.peek()
    if (scope.hasOwnProperty(name)) {
      error(name, `Variable with this name already declared in this scope.`)
    }
    scope[name] = false // "not ready yet" - declared but not initialized
  }

  this.define = function (name) {
    if (this.scopes.empty()) {
      return
    }
    const scope = this.scopes.peek()
    scope[name] = true
  }

  this.resolveLocal = function (v, name) {
    for (let i = this.scopes.stack.length - 1; i >= 0; i--) {
      if (this.scopes.stack[i].hasOwnProperty(name.lexeme)) {
	interpreter.resolve(v, this.scopes.stack.length - 1 - i)
	return
      }
    }
    // not found, assume global
  }

  this.resolveFunction = function (f) {
    // TODO - don't we need a try/finally to restore this.inFunction?
    let prevInFunction = this.inFunction
    this.inFunction = true
    this.beginScope()
    f.params.forEach(p => {
      let name = p.lexeme
      this.declare(name)
      this.define(name)
    })
    f.body.forEach(s => s.accept(this))
    this.endScope()
    this.inFunction = prevInFunction
  }
  
  this.visitBlockStatement = function (b) {
    this.beginScope()
    b.declarations.forEach(d => d.accept(this))
    this.endScope()
  }

  this.visitVarDeclaration = function (v) {
    let name = v.name.lexeme
    this.declare(name)
    if (v.val !== undefined) {
      v.val.accept(this)
    }
    this.define(name)
  }

  this.visitVariable = function (v) {
    if (!this.scopes.empty() && this.scopes.peek()[v.name.lexeme] === false) {
      error(v.name, `Cannot read local variable in its own initializer.`)
    }
    this.resolveLocal(v, v.name)
  }

  this.visitAssignment = function (a) {
    a.value.accept(this)
    this.resolveLocal(a, a.name)
  }

  this.visitFunDeclaration = function (f) {
    let name = f.name.lexeme
    this.declare(name)
    this.define(name)
    this.resolveFunction(f)
  }

  this.visitClassDeclaration = function (c) {
    let prevInClass = this.inClass
    this.inClass = true
    let prevHasSuperClass = this.hasSuperClass
    this.hasSuperClass = false
    let name = c.name.lexeme
    this.declare(name)
    this.define(name)
    // inheritance cycles not allowed, avoid class C < C {}
    // class A < B {}; class B < A {} isn't possible because B not defined.
    if (c.superclass !== null && name === c.superclass.name.lexeme) {
      error(c.superclass.name, "A class cannot inherit from itself.")
    }
    // Lox allows class declarations in blocks, so superclass name scope must be resolved
    if (c.superclass !== null) {
      this.hasSuperClass = true
      this.resolve(c.superclass)
      this.beginScope();
      this.define('super')
    }
    // LoxFunction.prototype.bind creates the scopes at runtime that correspond to this scope
    this.beginScope()
    this.define('this')
    c.methods.forEach(m => {
      let prevInInitializer = this.inInitializer
      if (m.name.lexeme === 'init') { this.inInitializer = true }
      this.resolveFunction(m)
      this.inInitializer = prevInInitializer
    })
    this.endScope()
    if (c.superclass !== null) {
      this.endScope()
    }
    this.hasSuperClass = prevHasSuperClass
    this.inClass = prevInClass
  }

  this.visitExpressionStatement = function (e) {
    e.expr.accept(this)
  }

  this.visitIfStatement = function (i) {
    i.condition.accept(this)
    i.then.accept(this)
    if (i.else !== undefined) { i.else.accept(this) }
  }

  this.visitPrintStatement = function (p) {
    p.expr.accept(this)
  }

  this.visitReturnStatement = function (r) {
    if (this.inFunction === false) {
      error(r.keyword, `Cannot return from top-level code.`)
    }
    if (r.value !== null) {
      if (this.inInitializer == true) {
	error(r.keyword, `Cannot return a value from an initializer.`)
      }
      r.value.accept(this)
    }
  }

  this.visitWhileStatement = function (w) {
    let prevLoopLevel = this.loopLevel
    this.loopLevel++
    w.condition.accept(this)
    w.body.accept(this)
    this.loopLevel = prevLoopLevel
  }

  this.visitBreakStatement = function (b) {
    if (this.loopLevel === 0) {
      error(b.keyword, `Break must be inside a loop`)
    }
  }

  this.visitBinary = function (b) {
    b.left.accept(this)
    b.right.accept(this)
  }

  this.visitCall = function (c) {
    c.callee.accept(this)
    c.args.forEach(a => a.accept(this))
  }

  this.visitGetterExpression = function (g) {
    g.object.accept(this)
  }

  this.visitSetterExpression = function (s) {
    s.object.accept(this)
    s.value.accept(this)
  }

  this.visitThisExpression = function (t) {
    if (this.inClass === false) {
      error(t.keyword, `Cannot use 'this' outside of a class.`)
    } else {
      this.resolveLocal(t, t.keyword)
    }
  }

  this.visitSuperExpression = function (s) {
    if (this.inClass === false) {
      error(s.keyword, `Cannot use 'super' outside of a class.`)
    } else if (this.hasSuperClass === false) {
      error(s.keyword, `Cannot use 'super' in a class with no superclass.`)
    } else {
      this.resolveLocal(s, s.keyword)
    }
  }
	
  this.visitGrouping = function (g) {
    g.expr.accept(this)
  }

  this.visitLiteral = function (l) {
  }

  this.visitLogical = function (l) {
    l.left.accept(this)
    l.right.accept(this)
  }

  this.visitUnary = function (u) {
    u.expr.accept(this)
  }
  
  this.visitProgram = function (p) {
    //this.beginScope()
    p.declarations.forEach(d => d.accept(this))
    //this.endScope()
  }

  this.resolve = function (e) {
    e.accept(this)
  }
}

module.exports = Resolver
