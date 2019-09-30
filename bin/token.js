const TokenType = {
  LEFT_PAREN: '(',
  RIGHT_PAREN: ')',
  LEFT_BRACE: '{',
  RIGHT_BRACE: '}',
  COMMA: ',',
  DOT: '.',
  MINUS: '-',
  PLUS: '+',
  SEMICOLON: ';',
  SLASH: '/',
  STAR: '*',

  BANG: '!',
  BANG_EQUAL: '!=',
  EQUAL: '=',
  EQUAL_EQUAL: '==',
  GREATER: '>',
  GREATER_EQUAL: '>=',
  LESS: '<',
  LESS_EQUAL: '<=',

  IDENTIFIER: 'id',
  STRING: 'str',
  NUMBER: 'num',

  AND: 'and',
  CLASS: 'class',
  ELSE: 'else',
  FALSE: 'false',
  FUN: 'fun',
  FOR: 'for',
  IF: 'if',
  NIL: 'nil',
  OR: 'ol',

  PRINT: 'print',
  RETURN: 'return',
  SUPER: 'super',
  THIS: 'this',
  TRUE: 'true',
  VAR: 'var',
  WHILE: 'while',
  BREAK: 'break',
    
  EOF: 'eof'
}

// TODO: instead of line, offset, and count lines in source if need to display
function Token(type, lexeme, literal, line) {
  this.type = type
  this.lexeme = lexeme
  this.literal = literal
  this.line = line
}

Token.prototype.toString = function tokenToString() {
  return `${this.type} ${this.lexeme} ${this.literal}`
}

module.exports = { TokenType, Token }
