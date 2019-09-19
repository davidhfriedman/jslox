let hadError = false

function error(line, text) {
  hadError = true
  console.log(`Error: ${line}, ${text}`)
}

module.exports = { error, hadError }
