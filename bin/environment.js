function Environment (enclosing) {
  this.values = {}
  this.enclosing = enclosing || null
}

class UndefinedVariableError extends Error {
  constructor(name) {
    super(`Undefined variable '${name}'.`)
    this.name = 'UndefinedVariableError'
  }
}

Environment.prototype.define = function(name, value) {
  // TODO: semantic choice: re-definition is not an error
  this.values[name] = value
}

Environment.prototype.assign = function(name, value) {
  // TODO: semantic choice: undefined throws a run-time error
  if (this.values.hasOwnProperty(name.lexeme)) {
    this.values[name.lexeme] = value
    return
  }
  if (this.enclosing != null) {
    return this.enclosing.assign(name, value)
  }
  throw new UndefinedVariableError(name.lexeme)
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

Environment.prototype.lookup = function(name) {
  // TODO: semantic choice: undefined throws a run-time error
  if (this.values.hasOwnProperty(name)) {
    return this.values[name]
  }
  if (this.enclosing != null) {
    return this.enclosing.lookup(name)
  }
  throw new UndefinedVariableError(name)
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
