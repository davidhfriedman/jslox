let errorOccurred = false

class InterpreterError extends Error {
  constructor(token, message) {
    super(`${token.line}: '${token.lexeme}' ${message}`)
    this.name = 'InterpreterError'
  }
}

function report(line, where, text) {
  errorOccurred = true
  console.log(`[line ${line}] Error at '${where}': ${text}`)
}

function hadError(val = undefined) {
  if (val === undefined) {
    return errorOccurred
  } else {
    errorOccurred = val
    return val
  }
}

module.exports = { report, hadError, InterpreterError }
