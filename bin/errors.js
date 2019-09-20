let hadError = false

function report(line, text) {
  hadError = true
  console.log(`Error: ${line}, ${text}`)
}

module.exports = { report, hadError }
