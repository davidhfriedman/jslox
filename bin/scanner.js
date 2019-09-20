const { TokenType, Token } = require('./token')
const { report } = require('./errors')

function Scanner(source) {
  this.source = source
  this.tokens = new Array()
  this.start = 0
  this.current = 0
  this.line = 1
}

Scanner.prototype.keywords = {
  'and': TokenType.AND,
  'class': TokenType.CLASS,
  'else': TokenType.ELSE,
  'false': TokenType.FALSE,
  'for': TokenType.FOR,
  'fun': TokenType.FUN,
  'if': TokenType.IF,
  'nil': TokenType.NIL,
  'or': TokenType.OR,
  'print': TokenType.PRINT,
  'return': TokenType.RETURN,
  'super': TokenType.SUPER,
  'this': TokenType.THIS,
  'true': TokenType.TRUE,
  'var': TokenType.VAR,
  'while': TokenType.WHILE,
}

Scanner.prototype.atEnd = function () {
  return this.current >= this.source.length
}

Scanner.prototype.advance = function () {
  this.current++
  return this.source[this.current-1]
}

Scanner.prototype.addToken = function (type, literal = undefined) {
  const text = this.source.substring(this.start, this.current)
  this.tokens.push(new Token(type, text, literal, this.line))
}

Scanner.prototype.match = function (expected) {
  if (this.atEnd()) { return false }
  if (this.source[this.current] != expected) { return false }
  this.current++
  return true
}

// Lox is a lookahead(2) language: need 2 for numbers
Scanner.prototype.peek = function () {
  if (this.atEnd()) { return '\0' }
  else { return this.source[this.current] }
}

Scanner.prototype.peekNext = function () {
  if (this.current + 1 >= this.source.length()) { return '\0' }
  else { return this.source[this.current + 1] }
}

// Lox supports multiline strings
// TODO but not in the REPL because this.atEnd() fires at the end of each line of input
// TODO escape sequences in strings: \n, \" etc
Scanner.prototype.string = function () {
  while (this.peek() != '"' && !this.atEnd()) {
    if (this.peek() == '\n') { this.line++ }
    this.advance()
  }
  if (this.atEnd()) {
    report(this.line, "Unterminated string.")
    return
  }
  this.advance() // the closing '"'
  const s = this.source.substring(this.start+1, this.current-1) // trim the quotation marks
  this.addToken(TokenType.STRING, s)
}

// TODO use Unicode properties

Scanner.prototype.isDigit = function (c) {
  return c === '0' || c === '1' || c === '2' || c === '3' || c === '4'
    || c === '5' || c === '6' || c === '7' || c === '8' || c === '9'
}

Scanner.prototype.isAlpha = function (c) {
  return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || (c === '_')
}

Scanner.prototype.isAlphaNumeric = function (c) {
  return this.isAlpha(c) || this.isDigit(c)
}

Scanner.prototype.number = function () {
  while (this.isDigit(this.peek())) { this.advance() }
  if (this.peek() === '.' && this.isDigit(peekNext())) {
    this.advance() // consume the '.'
    while (this.isDigit(this.peek())) { this.advance() }
  }
  this.addToken(TokenType.NUMBER, parseFloat(this.source.substring(this.start, this.current)))
}

Scanner.prototype.identifier = function () {
  while (this.isAlphaNumeric(this.peek())) { this.advance() }
  // reserved word?
  const text = this.source.substring(this.start, this.current)
  const type = this.keywords[text] || TokenType.IDENTIFIER
  this.addToken(type)
}

// TODO: coalesce multiple runs of single character errors
Scanner.prototype.scanToken = function () {
  const c = this.advance()
  switch (c) {
  case '(': this.addToken(TokenType.LEFT_PAREN); break
  case ')': this.addToken(TokenType.RIGHT_PAREN); break
  case '{': this.addToken(TokenType.LEFT_BRACE); break
  case '}': this.addToken(TokenType.RIGHT_BRACE); break
  case ',': this.addToken(TokenType.COMMA); break
  case '.': this.addToken(TokenType.DOT); break
  case '-': this.addToken(TokenType.MINUS); break
  case '+': this.addToken(TokenType.PLUS); break
  case ';': this.addToken(TokenType.SEMICOLON); break
  case '*': this.addToken(TokenType.STAR); break
  case '!': this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG); break
  case '=': this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL); break
  case '<': this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS); break
  case '>': this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER); break
  case '/':
    // a comment continues to the end of the line.
    if (this.match('/')) {
      while (this.peek() != '\n' && !this.atEnd()) { this.advance() }
    } else {
      this.addToken(TokenType.SLASH)
    }
    break
  case ' ':
  case '\r':
  case '\t':
    // ignore whitespace
    break
  case '\n':
    this.line++
    break
  case '"': this.string(); break
  default:
    if (this.isDigit(c)) {
      this.number()
    } else if (this.isAlpha(c)) {
      this.identifier()
    } else {
      report(line, `Unexpected character ${c}.`)
    }
    break
  }
}

Scanner.prototype.scanTokens = function () {
  while (!this.atEnd()) {
    this.start = this.current
    this.scanToken()
  }
  this.tokens.push(new Token(TokenType.EOF, "", undefined, this.line))
  return this.tokens
}

module.exports = Scanner
