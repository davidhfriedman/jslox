let errorOccurred = false

function report(line, text) {
  hadError = true
  console.log(`Error: ${line}, ${text}`)
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
