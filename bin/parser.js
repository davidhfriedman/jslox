/*
program   → statement* EOF ;

statement → exprStmt
          | printStmt ;

exprStmt  → expression ";" ;
printStmt → "print" expression ";" ;

expression     → equality ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → addition ( ( ">" | ">=" | "<" | "<=" ) addition )* ;
addition       → multiplication ( ( "-" | "+" ) multiplication )* ;
multiplication → unary ( ( "/" | "*" ) unary )* ;
unary          → ( "!" | "-" ) unary
               | primary ;
primary        → NUMBER | STRING | "false" | "true" | "nil"
               | "(" expression ")" ;
*/

const { TokenType, Token } = require('./token')
const { Program, PrintStatement, ExpressionStatement, Literal, Grouping, Unary, Binary } = require('./ast')
const { report } = require('./errors')

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
  else { throw this.error(this.peek(), message) }
}

Parser.prototype.error = function(token, message) {
  if (token.type === TokenType.EOF) {
    report(token.line, ` at end ${message}`)
  } else {
    report(token.line, ` at '${token.lexeme}' ${message}`)
  }
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
    case CLASS:
    case FUN:
    case VAR:
    case FOR:
    case IF:
    case WHILE:
    case PRINT:
    case RETURN:
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
    program.push(this.statement())
  }
  return new Program(program)
}

Parser.prototype.statement = function () {
  if (this.match(TokenType.PRINT)) {
    return this.printStatement()
  } else {
    return this.expressionStatement()
  }
}

Parser.prototype.printStatement = function () {
  let expr = this.expression()
  this.consume(TokenType.SEMICOLON, "Expect ';' after print statement")
  return new PrintStatement(expr)
}

Parser.prototype.expressionStatement = function () {
  let expr = this.expression()
  this.consume(TokenType.SEMICOLON, "Expect ';' after expression")
  return new ExpressionStatement(expr)
}

Parser.prototype.expression = function () {
  return this.equality()
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
    console.log(`ERROR: `, e)
    return null
  }
}

module.exports = Parser
