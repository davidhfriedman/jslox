const { report, InterpreterError } = require('./errors')

const error = function(token, message) {
  report(token.line, token.lexeme, message)
  return new InterpreterError(token, message)
}

function Environment (enclosing) {
  this.values = {}
  this.enclosing = enclosing || null
}

Environment.prototype.define = function(name, value) {
  // TODO: semantic choice: re-definition is not an error
  this.values[name] = value
}

Environment.prototype.assign = function(name, value) {
  if (this.values.hasOwnProperty(name.lexeme)) {
    this.values[name.lexeme] = value
    return
  }
  if (this.enclosing != null) {
    return this.enclosing.assign(name, value)
  }
  throw error(name, `Undefined variable '${name}'.`)
}

Environment.prototype.assignAt = function(distance, name, value) {
  // TODO: There must be a parent environment at distance with
  // a binding for 'name' because the resolver found it.
  // code defensively and check for null in the loop and the lookup?
  // Or let JavaScript throw an error if there is a bug?
  let environment = this
  for(let i = 0; i < distance; i++) {
    environment = environment.enclosing
  }
  environment.values[name.lexeme] = value
}

Environment.prototype.lookup = function(token) {
  // if token is a string, it can only be 'this' or 'super'
  // but those can't cause an Undefined variable (unless there
  // is an interpreter bug, in which case it doesn't matter
  // that there won't be a line property for the error exception)
  let name = (typeof token === 'string') ? token : token.lexeme
  if (this.values.hasOwnProperty(name)) {
    return this.values[name]
  }
  if (this.enclosing != null) {
    return this.enclosing.lookup(name)
  }
  throw error(token, `Undefined variable '${name}'.`)
}

Environment.prototype.lookupAt = function(distance, name) {
  // TODO: There must be a parent environment at distance with
  // a binding for 'name' because the resolver found it.
  // code defensively and check for null in the loop and the lookup?
  // Or let JavaScript throw an error if there is a bug?
  let environment = this
  for(let i = 0; i < distance; i++) {
    environment = environment.enclosing
  }
  return environment.values[name]
}

Environment.prototype.show = function(caption, indent = 0) {
  console.log() // testing
  console.log(caption+':') // testing
  this.show1(indent)
}

Environment.prototype.show1 = function(indent) {
  const i = ' '.repeat(indent)
  console.log(i, '<env [') // testing
  Object
    .getOwnPropertyNames(this.values)
    .forEach(p => 
	     console.log(i, '      ', `${p}: ${this.values[p]}`)) // testing
  if (this.enclosing) {
    console.log(i, '     ] ==>') // testing
    this.enclosing.show1(indent+2)
  } else {
    console.log(i, '     ] ==> NIL') // testing
  }
  console.log(i, '>\n') // testing
}

module.exports = { Environment }
