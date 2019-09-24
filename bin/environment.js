function Environment () {
  this.values = {}
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

Environment.prototype.lookup = function(name) {
  // TODO: semantic choice: undefined throws a run-time error
  if (this.values.hasOwnProperty(name)) {
    return this.values[name]
  }
  throw new UndefinedVariableError(name)
}

module.exports = { Environment }
