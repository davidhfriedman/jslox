const { TokenType, Token } = require('./token')
const { Program, VarDeclaration,
	Block, IfStatement, ExpressionStatement, PrintStatement, WhileStatement,
	BreakStatement,
	Assignment, Logical,
	Literal, Grouping, Unary, Binary, Variable } = require('./ast')
const { report, hadError } = require('./errors')

function Parser(tokens) {
  this.tokens = tokens
  this.current = 0
}

Parser.prototype.previous = function () {
  return this.tokens[this.current - 1]
}

Parser.prototype.peek = function () {
  return this.tokens[this.current]
}

Parser.prototype.atEnd = function () {
  return this.peek().type === TokenType.EOF
}

Parser.prototype.advance = function () {
  if (!this.atEnd()) { this.current++ }
  else { return this.previous() }
}

Parser.prototype.consume = function(type, message) {
  if (this.check(type)) { return this.advance() }
  else { throw this.error(this.peek(), message); }
}

Parser.prototype.error = function(token, message) {
  if (token.type === TokenType.EOF) {
    report(token.line, ` at end ${message}`)
  } else {
    report(token.line, ` at '${token.lexeme}' ${message}`)
  }
  hadError(true)
  return new ParseError(token, message)
}

class ParseError extends Error {
  constructor(token, message) {
    super(`${token} ${message}`)
    this.name = 'ParseError'
  }
}

// call this after a parse error to discard tokens until probable
// statement boundary, reducing cascading errors
Parser.prototype.synchronize = function () {
  this.advance()
  while (!this.atEnd()) {
    if (this.previous().type === TokenType.SEMICOLON) { return }
    switch (this.peek().type) {
    case TokenType.CLASS:
    case TokenType.FUN:
    case TokenType.VAR:
    case TokenType.FOR:
    case TokenType.IF:
    case TokenType.WHILE:
    case TokenType.PRINT:
    case TokenType.RETURN:
      return
    }
    this.advance()
  }
}

Parser.prototype.check = function (type) {
  if (this.atEnd()) { return false }
  else { return this.peek().type === type }
}

Parser.prototype.match = function (...types) {
  for (type of types) {
    if (this.check(type)) {
      this.advance()
      return true
    }
  }
  return false
}

Parser.prototype.program = function () {
  let program = []
  while (!this.atEnd()) {
    program.push(this.declaration())
  }
  return new Program(program)
}

Parser.prototype.declaration = function () {
  if (this.match(TokenType.VAR)) {
    return this.varDeclaration()
  } else if (this.match(TokenType.FOR)) {
    return this.forStatement()
  } else if (this.match(TokenType.IF)) {
    return this.ifStatement()
  } else if (this.match(TokenType.LEFT_BRACE)) {
    return this.blockStatement()
  } else if (this.match(TokenType.PRINT)) {
    return this.printStatement()
  } else if (this.match(TokenType.WHILE)) {
    return this.whileStatement()
  } else if (this.match(TokenType.BREAK)) {
    return this.breakStatement()
  } else {
    return this.expressionStatement()
  }
}

Parser.prototype.varDeclaration = function () {
  let name, value
  if (this.match(TokenType.IDENTIFIER)) {
    name = this.previous()
    if (this.match(TokenType.EQUAL)) {
      value = this.expression()
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration")
    return new VarDeclaration(name, value)
  }
}

Parser.prototype.whileStatement = function () {
  this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
  const condition = this.expression()
  this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
  // TODO: factor statement out of declaration, because a lone varDec after while is a no-op.
  const body = this.declaration()
  return new WhileStatement(condition, body)
}

Parser.prototype.breakStatement = function () {
  this.consume(TokenType.SEMICOLON, "Expect ';' after break statement")
  return new BreakStatement()
}

Parser.prototype.blockStatement = function () {
  let statements = []
  while (!this.check(TokenType.RIGHT_BRACE) && !this.atEnd()) {
    statements.push(this.declaration())
  }
  this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
  return new Block(statements)
}

Parser.prototype.forStatement = function () {
  this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");
  let initializer
  if (this.match(TokenType.SEMICOLON)) {
    initializer = undefined
  } else if (this.match(TokenType.VAR)) {
    // TODO for(var a = b = c; will work here, is that ok?
    initializer = this.varDeclaration();
  } else {
    initializer = this.expressionStatement()
  }

  let condition
  if (!this.check(TokenType.SEMICOLON)) {
    condition = this.expression()
  }
  this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.")

  let increment = null
  if (!this.check(TokenType.RIGHT_PAREN)) {
    increment = this.expression()
  }
  this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.")

  // TODO: factor statement out of declaration, because a lone varDec after while is a no-op.
  let body = this.declaration()

  if (increment != null) {
    body = new Block([body, new ExpressionStatement(increment)])
  }

  if (condition === undefined) {
    condition = new Literal(true)
  }
  body = new WhileStatement(condition, body)

  if (initializer !== undefined) {
    body = new Block([initializer, body])
  }
  
  return body
}

Parser.prototype.ifStatement = function () {
  let condition, whenTrue, whenFalse
  if (this.match(TokenType.LEFT_PAREN)) {
    condition = this.expression()
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after IF condition.");
    // TODO: factor statement out of declaration, because a lone varDec after an IF is a no-op.
    whenTrue = this.declaration()
    if (this.match(TokenType.ELSE)) {
      whenFalse = this.declaration()
    }
    return new IfStatement(condition, whenTrue, whenFalse)
  }
}

Parser.prototype.expressionStatement = function () {
  let expr = this.expression()
  this.consume(TokenType.SEMICOLON, "Expect ';' after expression")
  return new ExpressionStatement(expr)
}

Parser.prototype.printStatement = function () {
  let expr = this.expression()
  this.consume(TokenType.SEMICOLON, "Expect ';' after print statement")
  return new PrintStatement(expr)
}

Parser.prototype.expression = function () {
  return this.assignment()
}

Parser.prototype.assignment = function () {
  let expression = this.logical_or()
  if (this.match(TokenType.EQUAL)) {
    let lval = this.previous()
    let value = this.assignment()
    if (expression instanceof Variable) {
      let name = expression.name.lexeme
      return new Assignment(name, value)
    }
    return this.error(lval, "Invalid assignment target.")
  }
  return expression
}

Parser.prototype.logical_or = function () {
  let expr = this.logical_and()
  while (this.match(TokenType.OR)) {
    const operator = this.previous()
    const right = this.logical_and()
    expr = new Logical(expr, operator, right)
  }
  return expr
}

Parser.prototype.logical_and = function () {
  let expr = this.equality()
  while (this.match(TokenType.AND)) {
    const operator = this.previous()
    const right = this.equality()
    expr = new Logical(expr, operator, right)
  }
  return expr
}

Parser.prototype.equality = function () {
  let expr = this.comparison()
  // left associative
  while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
    const operator = this.previous()
    const right = this.comparison()
    expr = new Binary(expr, operator, right)
  }
  return expr
}

Parser.prototype.comparison = function () {
  let expr = this.addition()
  // left associative
  while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
    const operator = this.previous()
    const right = this.addition()
    expr = new Binary(expr, operator, right)
  }
  return expr
}

Parser.prototype.addition = function () {
  let expr = this.multiplication()
  // left associative
  while (this.match(TokenType.MINUS, TokenType.PLUS)) {
    const operator = this.previous()
    const right = this.multiplication()
    expr = new Binary(expr, operator, right)
  }
  return expr
}

Parser.prototype.multiplication = function () {
  let expr = this.unary()
  // left associative
  while (this.match(TokenType.SLASH, TokenType.STAR)) {
    const operator = this.previous()
    const right = this.unary()
    expr = new Binary(expr, operator, right)
  }
  return expr
}

// TODO: DRY the repetitive patterns above

Parser.prototype.unary = function () {
  if (this.match(TokenType.BANG, TokenType.MINUS)) {
    const operator = this.previous()
    const right = this.unary()
    return new Unary(operator, right)
  } else {
    return this.primary()
  }
}

Parser.prototype.primary = function () {
  if (this.match(TokenType.FALSE)) { return new Literal(false) }
  if (this.match(TokenType.TRUE)) { return new Literal(true) }
  if (this.match(TokenType.NIL)) { return new Literal(null) }
  if (this.match(TokenType.NUMBER, TokenType.STRING)) { return new Literal(this.previous().literal) }
  if (this.match(TokenType.IDENTIFIER)) { return new Variable(this.previous()) }
  if (this.match(TokenType.LEFT_PAREN)) {
    const expr = this.expression()
    this.consume(TokenType.RIGHT_PAREN, `Expect ')' after expression.`)
    return new Grouping(expr)
  }
  throw this.error(this.peek(), "Expect expression.")
}

Parser.prototype.parse = function () {
  try {
    return this.program()
  } catch (e) {
    hadError(true)
    return e
  }
}

module.exports = Parser
