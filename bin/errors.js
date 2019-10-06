let errorOccurred = false

function report(line, where, text) {
  hadError = true
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

module.exports = { report, hadError }
