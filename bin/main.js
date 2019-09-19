#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const { TokenType, Token } = require('./token')
const Scanner = require('./scanner')
let { hadError } = require('./errors')

hadError = false

function main() {
  if (process.argv.length > 3) {
    console.log("Usage: jslox [script]")
    process.exit(64)
  } else if (process.argv.length == 3) {
    runFile(process.argv[2])
  } else {                   
    runPrompt()
  }
  return 0
}

function error(line, message) {                       
  report(line, "", message)
}

function report(line, where, message) {
  console.log(`[line ${line}] Error ${where}: ${message}`)
  hadError = true
}

function run(source) {
  hadError = false
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  // For now, just print the tokens.        
  tokens.forEach(token => console.log(`<${token}>`))
}

function runFile(path) {
  run(fs.readFileSync(path, 'utf8'))
  if (hadError) {
    process.exit(65)
  }
}

function runPrompt() { 
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })
  
  rl.prompt()
  
  rl.on('line', (line) => {
    run(line)
    hadError = false // don't kill the interactive session
    rl.prompt()
  })
}

main()
