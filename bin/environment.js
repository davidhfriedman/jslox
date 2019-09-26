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
  if (this.values.hasOwnProperty(name)) {
    this.values[name] = value
    return
  }
  if (this.enclosing != null) {
    this.enclosing.assign(name, value)
  }
  throw new UndefinedVariableError(name)
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

module.exports = { Environment }
